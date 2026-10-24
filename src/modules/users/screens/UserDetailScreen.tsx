import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Screen,
  Card,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  Select,
  StatusChip,
  SectionHeader,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  useBreakpoint,
} from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { ROLE_LABELS, type Role } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { formatDateTime } from "@shared/format";
import { useUser, useUpdateUser, useResetPassword, useRoleCatalogue } from "../hooks/useUsers";
import { PermissionEditor } from "../components/PermissionEditor";
import { TemporaryPasswordPanel } from "../components/TemporaryPasswordPanel";
import { StaffAttendanceCard } from "../components/StaffAttendanceCard";
import type { UsersParamList } from "../UsersNavigator";

type Props = NativeStackScreenProps<UsersParamList, "UserDetail">;

export default function UserDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { isWide } = useBreakpoint();
  const me = useAuthStore((s) => s.staff?.id);
  const user = useUser(id);
  const catalogue = useRoleCatalogue();
  const update = useUpdateUser(id);
  const reset = useResetPassword(id);

  // null until edited, so a refetch after saving shows the server's list
  const [draft, setDraft] = useState<string[] | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"deactivate" | "reset" | null>(null);
  const [temp, setTemp] = useState<string | null>(null);

  const u = user.data;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: "success", text: ok });
    } catch (err) {
      setMessage({ tone: "danger", text: apiErrorMessage(err) });
    }
  };

  if (user.isLoading) return <Screen title="Login"><Skeleton height={200} /></Screen>;
  if (user.error || !u) return <Screen title="Login"><ErrorState error={user.error} onRetry={() => void user.refetch()} /></Screen>;

  const perms = draft ?? u.permissions;
  const setPerms = setDraft;
  const roleDefaults = catalogue.data?.roles.find((r) => r.role === u.role)?.defaultPermissions ?? [];
  const dirty = perms.slice().sort().join(",") !== u.permissions.slice().sort().join(",");
  const isOwner = u.role === "owner";

  return (
    <Screen
      title={u.name}
      overline="Staff login"
      testID="user-detail"
      right={<Button label="All logins" variant="ghost" size="sm" onPress={() => navigation.navigate("UsersList")} />}
    >
      <VStack gap={16}>
        {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}
        {temp ? (
          <Card>
            <TemporaryPasswordPanel username={u.username} password={temp} />
          </Card>
        ) : null}

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <Card style={styles.cell}>
            <VStack gap={10}>
              <HStack gap={8} align="center" wrap>
                <StatusChip status={u.isActive ? "active" : "inactive"} />
                {u.mustChangePassword ? <Text variant="caption" tone="warning">Has not set a password yet</Text> : null}
              </HStack>
              <Text tone="secondary">Username {u.username}</Text>
              {u.phone ? <Text tone="secondary">Mobile {u.phone}</Text> : null}
              <Text variant="caption" tone="tertiary">Last sign-in {formatDateTime(u.lastLoginAt)}</Text>
              <Select
                label="Role"
                value={u.role}
                options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                onChange={(v) => run(async () => { await update.mutateAsync({ role: v as Role }); setDraft(null); }, "Role changed. Permissions reset to that role's defaults.")}
                hint="Changing the role resets the permissions below to that role's defaults."
              />
              <HStack gap={8} wrap>
                <Button label="Reset password" variant="secondary" onPress={() => setConfirm("reset")} />
                {u.isActive ? (
                  id !== me ? <Button label="Deactivate" variant="destructive" onPress={() => setConfirm("deactivate")} /> : null
                ) : (
                  <Button label="Reactivate" onPress={() => run(() => update.mutateAsync({ isActive: true }), "Reactivated.")} />
                )}
              </HStack>
            </VStack>
          </Card>

          <Card style={styles.cell}>
            <VStack gap={10}>
              <SectionHeader
                title="What they can do"
                subtitle={isOwner ? "The owner can do everything." : "Starts from the role; adjust for this person."}
              />
              {isOwner ? null : (
                <>
                  <PermissionEditor
                    assignable={catalogue.data?.assignablePermissions ?? []}
                    value={perms}
                    roleDefaults={roleDefaults}
                    onChange={setPerms}
                  />
                  <HStack gap={8}>
                    <Button
                      label="Save permissions"
                      disabled={!dirty}
                      loading={update.isPending}
                      onPress={() => run(async () => { await update.mutateAsync({ permissions: perms }); setDraft(null); }, "Saved. It applies to their very next action.")}
                    />
                    {dirty ? <Button label="Undo" variant="ghost" onPress={() => setDraft(null)} /> : null}
                  </HStack>
                </>
              )}
            </VStack>
          </Card>
        </View>
        <StaffAttendanceCard user={u} />
      </VStack>

      <ConfirmDialog
        visible={confirm === "deactivate"}
        title={`Deactivate ${u.name}?`}
        message="They are signed out everywhere at once and cannot sign in. Their history stays, under their name."
        confirmLabel="Deactivate"
        destructive
        loading={update.isPending}
        onConfirm={() => run(async () => { await update.mutateAsync({ isActive: false }); setConfirm(null); }, "Deactivated.")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === "reset"}
        title={`Reset ${u.name}'s password?`}
        message="They are signed out everywhere and get a new temporary password, shown once here."
        confirmLabel="Reset"
        loading={reset.isPending}
        onConfirm={() =>
          run(async () => {
            const r = await reset.mutateAsync();
            setTemp(r.temporaryPassword);
            setConfirm(null);
          }, "Password reset. Give them the temporary password below.")
        }
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 16 },
  gridWide: { flexDirection: "row", alignItems: "flex-start" },
  cell: { flex: 1 },
});
