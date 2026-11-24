import React, { useState } from "react";
import { KeyRound } from "lucide-react-native";
import { Card, VStack, HStack, Text, Button, SectionHeader, TextField, ConfirmDialog, CopyButton, Banner } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatDateTime } from "@shared/format";
import type { ParentLoginInfo } from "../types";

interface Props {
  login: ParentLoginInfo;
  canManage: boolean;
  /** No password: the server generates one. Resolves once the new slip is shown. */
  onReset: (password?: string) => Promise<void>;
  resetting: boolean;
  /** Rename the sign-in IDs. Rejects when the server refuses, so the form stays open. */
  onSaveIds: (body: { username: string; oldPortalIds: string[] }) => Promise<void>;
  savingIds: boolean;
  /** The temporary password just made by a reset: shown here once, to copy. */
  newPassword?: string | null;
}

/** What the server accepts, typed in any case: it stores the ID in lower case. */
const ID_PATTERN = /^[a-z0-9._@-]{3,40}$/i;

/**
 * The family's sign-in to the parent app, as seen from one child's profile.
 * Only the password's state is shown: the password is kept as a hash, so the
 * only way to give a parent one is a new temporary password.
 */
export function ParentLoginCard({ login, canManage, onReset, resetting, onSaveIds, savingIds, newPassword }: Props) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [oldIds, setOldIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [typing, setTyping] = useState(false);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");

  const status = passwordStatus(login);
  const mismatch = again.length > 0 && password !== again;
  const canSave = password.length >= 10 && password === again;

  const startEditing = () => {
    setUsername(login.username);
    setOldIds(login.oldPortalIds ?? []);
    setEditing(true);
  };
  const cleanOld = oldIds.map((x) => x.trim()).filter(Boolean);
  const idError = (v: string) => (v.trim() && !ID_PATTERN.test(v.trim()) ? "3 to 40 letters, digits or . _ @ -" : undefined);
  const upper = [username.trim(), ...cleanOld].map((x) => x.toUpperCase());
  const repeated = upper.find((x, i) => upper.indexOf(x) !== i);
  const changed =
    username.trim().toUpperCase() !== login.username || cleanOld.map((x) => x.toUpperCase()).join("|") !== (login.oldPortalIds ?? []).join("|");
  const canSaveIds = changed && ID_PATTERN.test(username.trim()) && cleanOld.every((x) => ID_PATTERN.test(x)) && !repeated;

  const closeTyping = () => {
    setTyping(false);
    setPassword("");
    setAgain("");
  };

  return (
    <Card testID="student-parent-login">
      <VStack gap={8}>
        <SectionHeader
          title="Parent login"
          right={
            canManage && !editing ? (
              <Button label="Edit" variant="ghost" size="sm" fullWidth={false} onPress={startEditing} testID="student-parent-edit" />
            ) : undefined
          }
        />
        {editing ? (
          <VStack gap={10}>
            <TextField
              label="Login ID"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="characters"
              autoCorrect={false}
              error={idError(username)}
              hint="What the parent types to sign in."
              testID="student-parent-edit-username"
            />
            {oldIds.map((v, i) => (
              <HStack key={i} gap={8} align="flex-end">
                <TextField
                  label={oldIds.length > 1 ? `Old portal ID ${i + 1}` : "Old portal ID"}
                  value={v}
                  onChangeText={(t) => setOldIds(oldIds.map((x, j) => (j === i ? t : x)))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  error={idError(v)}
                  containerStyle={{ flex: 1 }}
                  testID={`student-parent-edit-old-${i}`}
                />
                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  accessibilityHint="This ID stops signing in"
                  onPress={() => setOldIds(oldIds.filter((_, j) => j !== i))}
                />
              </HStack>
            ))}
            <Button label="Add old portal ID" variant="ghost" size="sm" fullWidth={false} onPress={() => setOldIds([...oldIds, ""])} />
            {repeated ? (
              <Text variant="caption" tone="danger">
                &quot;{repeated}&quot; is entered twice.
              </Text>
            ) : null}
            <Text variant="caption" tone="tertiary">
              Every ID here signs in to the same account with the same password. Tell the parent the new ID; the password does not change.
            </Text>
            <HStack gap={8} wrap>
              <Button
                label="Save"
                size="sm"
                fullWidth={false}
                disabled={!canSaveIds}
                loading={savingIds}
                onPress={() =>
                  void onSaveIds({ username: username.trim(), oldPortalIds: cleanOld }).then(
                    () => setEditing(false),
                    () => undefined,
                  )
                }
                testID="student-parent-edit-save"
              />
              <Button label="Cancel" variant="secondary" size="sm" fullWidth={false} onPress={() => setEditing(false)} />
            </HStack>
          </VStack>
        ) : (
          <>
            <Fact label="Login ID" value={login.username} />
            {login.oldPortalIds?.length ? <Fact label="Old portal ID" value={login.oldPortalIds.join(", ")} /> : null}
          </>
        )}
        <HStack gap={8} align="flex-start">
          <Text variant="body-sm" tone="tertiary" style={{ width: 120 }}>
            Password
          </Text>
          <HStack gap={6} align="center" style={{ flex: 1 }}>
            <KeyRound size={16} color={palette[status.tone === "success" ? "success" : status.tone === "danger" ? "danger" : "warning"].text} />
            <Text variant="body-sm" tone={status.tone} style={{ flex: 1 }} testID="student-parent-password-status">
              {status.text}
            </Text>
          </HStack>
        </HStack>
        <Fact label="Last sign-in" value={login.lastLoginAt ? formatDateTime(login.lastLoginAt) : "Never signed in"} />
        {newPassword && !editing ? (
          <VStack gap={8} testID="parent-new-password">
            <Banner tone="warning" message="New temporary password. It is shown only now: copy it and give it to the parent." />
            <HStack gap={12} align="center" wrap>
              <Text variant="body-sm" tone="tertiary" style={{ width: 120 }}>
                Temporary password
              </Text>
              <Text variant="h3" selectable style={{ fontFamily: "monospace" }} testID="parent-new-password-value">
                {newPassword}
              </Text>
              <CopyButton text={newPassword} what="the temporary password" successMessage="Password copied successfully." testID="parent-copy-password" />
            </HStack>
            <Text variant="caption" tone="tertiary">
              The parent signs in with it once, then sets their own password.
            </Text>
          </VStack>
        ) : null}
        {login.children > 1 ? <Fact label="Shared with" value={`${login.children} children on this login`} /> : null}

        {canManage && !editing ? (
          <VStack gap={10}>
            <HStack gap={8} wrap>
              <Button label="Reset password" variant="secondary" size="sm" onPress={() => setConfirm(true)} testID="student-parent-reset" />
              <Button
                label={typing ? "Cancel" : "Set a password"}
                variant="ghost"
                size="sm"
                onPress={() => (typing ? closeTyping() : setTyping(true))}
                testID="student-parent-set"
              />
            </HStack>
            {login.children > 1 ? (
              <Text variant="caption" tone="tertiary">
                This login is shared by {login.children} children. A new password applies to all of them.
              </Text>
            ) : null}
            {typing ? (
              <VStack gap={10}>
                <TextField
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="off"
                  hint="At least 10 characters. The parent changes it at the next sign-in."
                  testID="student-parent-new-password"
                />
                <TextField
                  label="Type it again"
                  value={again}
                  onChangeText={setAgain}
                  secureTextEntry
                  autoComplete="off"
                  error={mismatch ? "The two passwords are different" : undefined}
                  testID="student-parent-new-password-again"
                />
                <Button
                  label="Save password"
                  disabled={!canSave}
                  loading={resetting}
                  onPress={() => void onReset(password).then(closeTyping, () => undefined)}
                  testID="student-parent-set-save"
                />
              </VStack>
            ) : null}
          </VStack>
        ) : null}
      </VStack>

      <ConfirmDialog
        visible={confirm}
        title="Reset the parent's password?"
        message={`A new temporary password is made for ${login.username} and shown once on a slip. Every phone signed in to it is signed out.`}
        confirmLabel="Reset password"
        loading={resetting}
        onConfirm={() => void onReset().finally(() => setConfirm(false))}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}

function passwordStatus(l: ParentLoginInfo): { text: string; tone: "success" | "warning" | "danger" } {
  if (l.isActive === false) return { text: "Login turned off", tone: "danger" };
  if (l.lockedUntil) return { text: `Locked after wrong passwords, until ${formatDateTime(l.lockedUntil)}`, tone: "danger" };
  if (l.mustChangePassword)
    return {
      text: l.passwordChangedAt ? `Temporary password, reset ${formatDateTime(l.passwordChangedAt)}` : "Temporary password, not yet changed by the parent",
      tone: "warning",
    };
  return {
    text: l.passwordChangedAt ? `Set by the parent on ${formatDateTime(l.passwordChangedAt)}` : "Set by the parent",
    tone: "success",
  };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={8} align="flex-start">
      <Text variant="body-sm" tone="tertiary" style={{ width: 120 }}>
        {label}
      </Text>
      <Text variant="body-sm" style={{ flex: 1 }} selectable>
        {value}
      </Text>
    </HStack>
  );
}
