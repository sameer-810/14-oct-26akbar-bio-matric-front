import { useEffect } from "react";
import { create } from "zustand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@shared/store/useAuthStore";
import { parentApi } from "../api/parentApi";
import type { Child } from "../types";

/** Which child the family is looking at; siblings share one sign-in. */
const useChildStore = create<{ childId: string | null; setChildId: (id: string) => void }>((set) => ({
  childId: null,
  setChildId: (childId) => set({ childId }),
}));

export const useParentSettings = () =>
  useQuery({ queryKey: ["parent", "settings"], queryFn: parentApi.settings, staleTime: 5 * 60_000 });

export const useChildren = () => useQuery({ queryKey: ["parent", "children"], queryFn: parentApi.children, refetchInterval: 30_000 });

/** The selected child, defaulting to the first. */
export function useSelectedChild(): { child: Child | null; children: Child[]; select: (id: string) => void; isLoading: boolean; error: unknown } {
  const q = useChildren();
  const childId = useChildStore((s) => s.childId);
  const select = useChildStore((s) => s.setChildId);
  const list = q.data ?? [];
  return {
    child: list.find((c) => c.id === childId) ?? list[0] ?? null,
    children: list,
    select,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export const useChildToday = (id: string | undefined) =>
  useQuery({ queryKey: ["parent", "today", id], queryFn: () => parentApi.today(id as string), enabled: Boolean(id), refetchInterval: 30_000 });

export const useOverview = (id: string | undefined) =>
  useQuery({ queryKey: ["parent", "overview", id], queryFn: () => parentApi.overview(id as string), enabled: Boolean(id) });

export const useChildDays = (id: string | undefined, from: string, to: string) =>
  useQuery({ queryKey: ["parent", "days", id, from, to], queryFn: () => parentApi.days(id as string, from, to), enabled: Boolean(id) });

export const useChildLeaves = (id: string | undefined) =>
  useQuery({ queryKey: ["parent", "leaves", id], queryFn: () => parentApi.leaves(id as string), enabled: Boolean(id) });

export const useResults = (id: string | undefined, enabled = true) =>
  useQuery({ queryKey: ["parent", "results", id], queryFn: () => parentApi.results(id as string), enabled: Boolean(id) && enabled });

export const useChildFees = (id: string | undefined) =>
  useQuery({ queryKey: ["parent", "fees", id], queryFn: () => parentApi.fees(id as string), enabled: Boolean(id) });

export const useFamilyNotices = () => useQuery({ queryKey: ["parent", "notices"], queryFn: parentApi.notices });

export const useFamilyDocuments = (enabled = true) =>
  useQuery({ queryKey: ["parent", "documents"], queryFn: parentApi.documents, enabled });

export const useFamilyIssues = () => useQuery({ queryKey: ["parent", "issues"], queryFn: parentApi.issues });

export const useFamilyIssue = (id: string) =>
  useQuery({ queryKey: ["parent", "issue", id], queryFn: () => parentApi.issue(id), refetchInterval: 30_000 });

export const useInbox = () => useQuery({ queryKey: ["parent", "inbox"], queryFn: () => parentApi.inbox(1), refetchInterval: 30_000 });

export function useParentActions() {
  const qc = useQueryClient();
  const refresh = (key: string) => void qc.invalidateQueries({ queryKey: ["parent", key] });
  return {
    applyLeave: useMutation({
      mutationFn: (v: { studentId: string; from: string; to: string; reason: string }) =>
        parentApi.applyLeave(v.studentId, { from: v.from, to: v.to, reason: v.reason }),
      onSuccess: () => refresh("leaves"),
    }),
    raiseIssue: useMutation({ mutationFn: parentApi.raiseIssue, onSuccess: () => refresh("issues") }),
    commentOnIssue: useMutation({
      mutationFn: (v: { id: string; body: string }) => parentApi.commentOnIssue(v.id, v.body),
      onSuccess: () => {
        refresh("issues");
        refresh("issue");
      },
    }),
    markRead: useMutation({ mutationFn: (ids?: string[]) => parentApi.markRead(ids), onSuccess: () => refresh("inbox") }),
    setPreferences: useMutation({
      mutationFn: parentApi.setPreferences,
      onSuccess: (account) => useAuthStore.getState().updateAccount(account),
    }),
  };
}

/** Keeps the selection valid when the list changes (a child left, a sibling was linked). */
export function useKeepChildSelected() {
  const { child, select } = useSelectedChild();
  const childId = useChildStore((s) => s.childId);
  useEffect(() => {
    if (child && child.id !== childId) select(child.id);
  }, [child, childId, select]);
}
