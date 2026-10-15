import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { decode } from "base-64";
import axios from "axios";
import { environment } from "@config/env";
import type { Role } from "../permissions";
import { queryClient } from "../api/queryClient";

// some RN engines lack `atob`, used below to read the token expiry
const runtimeGlobal = globalThis as unknown as { atob?: typeof decode };
if (!runtimeGlobal.atob) runtimeGlobal.atob = decode;

/** Staff and parents sign in through different doors and get different tokens. */
export type Audience = "staff" | "parent";

export interface StaffAccount {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  roleLabel: string;
  permissions: string[];
  teacherId: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface ParentAccount {
  id: string;
  username: string;
  name: string;
  phone: string;
  studentIds: string[];
  mustChangePassword: boolean;
  notify: { entry: boolean; exit: boolean; absent: boolean };
}

interface AuthState {
  audience: Audience | null;
  staff: StaffAccount | null;
  parent: ParentAccount | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isAuthChecked: boolean;

  signedIn: (audience: Audience, account: StaffAccount | ParentAccount, token: string, refreshToken: string) => void;
  updateTokens: (token: string, refreshToken: string) => void;
  updateAccount: (account: StaffAccount | ParentAccount) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  hasPermission: (permission: string) => boolean;
}

/** The base path of the door this session came through. */
export const authBase = (audience: Audience | null) => (audience === "parent" ? "/parent/auth" : "/auth");

export function isTokenExpired(token: string | null) {
  if (!token) return true;
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const base64 = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const { exp } = JSON.parse(atob(base64));
    return exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

/** The OS keystore on phones; localStorage on the web (no keystore exists there). */
const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(name, value);
      } catch {
        /* private window: the session just will not persist */
      }
      return;
    }
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(name);
      } catch {
        /* nothing to do */
      }
      return;
    }
    await SecureStore.deleteItemAsync(name);
  },
};

const STORAGE_KEY = "akbars-auth";

/** A burst of 401s must trigger one refresh, not twenty. */
let refreshPromise: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      audience: null,
      staff: null,
      parent: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      isAuthChecked: false,

      signedIn: (audience, account, token, refreshToken) =>
        set({
          audience,
          staff: audience === "staff" ? (account as StaffAccount) : null,
          parent: audience === "parent" ? (account as ParentAccount) : null,
          token,
          refreshToken,
          isAuthenticated: true,
        }),

      updateTokens: (token, refreshToken) => set({ token, refreshToken, isAuthenticated: true }),

      // the account is re-read from the server on refresh, so a changed role,
      // a revoked permission or the forced-password flag is never stale here —
      // the previous parent app lost the flag on restart and let parents skip it
      updateAccount: (account) =>
        set((s) => (s.audience === "parent" ? { parent: account as ParentAccount } : { staff: account as StaffAccount })),

      logout: async () => {
        const { refreshToken, audience } = get();
        set({ audience: null, staff: null, parent: null, token: null, refreshToken: null, isAuthenticated: false });
        queryClient.clear();
        await secureStorage.removeItem(STORAGE_KEY);
        if (refreshToken) {
          try {
            await axios.post(`${environment.apiUrl}${authBase(audience)}/logout`, { refreshToken }, { timeout: 10_000 });
          } catch {
            // the session expires on its own; signing out locally is what matters
          }
        }
      },

      hasPermission: (permission) => Boolean(get().staff?.permissions?.includes(permission)),

      refreshSession: async () => {
        if (refreshPromise) return refreshPromise;
        refreshPromise = (async () => {
          try {
            const { refreshToken, audience } = get();
            if (!refreshToken || !audience) {
              await get().logout();
              return null;
            }
            const rs = await axios.post(`${environment.apiUrl}${authBase(audience)}/refresh`, { refreshToken });
            const { accessToken, refreshToken: next, account } = rs.data.data;
            set({ token: accessToken, refreshToken: next, isAuthenticated: true });
            get().updateAccount(account);
            return accessToken as string;
          } catch (err) {
            // only a refusal signs out; a dropped network must not
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401 || status === 403) await get().logout();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
        return refreshPromise;
      },

      initializeAuth: async () => {
        const { token, refreshToken } = get();
        if (!token && !refreshToken) {
          set({ isAuthChecked: true });
          return;
        }
        // always refresh once at start: it re-reads the account, so the
        // forced-password flag and permissions come from the server, not storage
        if (refreshToken) {
          await get().refreshSession();
          set({ isAuthenticated: Boolean(get().refreshToken), isAuthChecked: true });
          return;
        }
        set({ isAuthenticated: !isTokenExpired(token), isAuthChecked: true });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({
        audience: s.audience,
        staff: s.staff,
        parent: s.parent,
        token: s.token,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
