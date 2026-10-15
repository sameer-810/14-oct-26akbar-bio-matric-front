import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { KeyRound } from "lucide-react-native";

import { Screen, Text, Card, VStack, HStack, Button, TextField, Banner, useBreakpoint } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { useAuthStore } from "@shared/store/useAuthStore";
import { authApi } from "../api/authApi";
import { changePasswordSchema, fieldErrors, type FieldErrors } from "../auth.validation";

/**
 * Used two ways: `forced` after signing in with a temporary password (the only
 * screen reachable until it is done — the server refuses everything else too),
 * and from the profile for an ordinary change.
 */
export default function ChangePasswordScreen({ forced = false, onDone }: { forced?: boolean; onDone?: () => void }) {
  const { isWide } = useBreakpoint();
  const audience = useAuthStore((s) => s.audience) ?? "staff";
  const signedIn = useAuthStore((s) => s.signedIn);
  const logout = useAuthStore((s) => s.logout);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const parsed = changePasswordSchema.safeParse(form);
    setErrors(fieldErrors(parsed));
    if (!parsed.success) return;
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.changePassword(audience, form.currentPassword, form.newPassword);
      // the change revoked every older token; carry on with the fresh pair
      signedIn(audience, r.account, r.accessToken, r.refreshToken);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not change the password"));
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <Card>
      <VStack gap={16}>
        {forced ? (
          <Banner
            tone="info"
            title="Choose your own password"
            message="You signed in with a temporary password. Set one only you know before continuing."
          />
        ) : null}
        {done && !forced ? <Banner tone="success" message="Password changed. Your other devices were signed out." /> : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField
          label={forced ? "Temporary password" : "Current password"}
          value={form.currentPassword}
          onChangeText={set("currentPassword")}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          error={errors.currentPassword}
          testID="cp-current"
        />
        <TextField
          label="New password"
          value={form.newPassword}
          onChangeText={set("newPassword")}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          hint="At least 10 characters. A short sentence is easier to remember than symbols."
          error={errors.newPassword}
          testID="cp-new"
        />
        <TextField
          label="Type it again"
          value={form.confirm}
          onChangeText={set("confirm")}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={errors.confirm}
          testID="cp-confirm"
          onSubmitEditing={submit}
        />
        <Button label="Change password" onPress={submit} loading={busy} fullWidth testID="cp-submit" />
        {forced ? <Button label="Sign out" variant="ghost" onPress={() => void logout()} fullWidth /> : null}
      </VStack>
    </Card>
  );

  if (!forced) return body;

  return (
    <Screen testID="forced-password-screen">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={24}>
          <HStack gap={12} align="center">
            <View style={styles.mark}>
              <KeyRound size={26} color={palette.text.inverse} />
            </View>
            <Text variant="h1" heading={1}>
              Set your password
            </Text>
          </HStack>
          {body}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 32, width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 440, paddingTop: 80 },
  mark: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: palette.primary[700],
    alignItems: "center",
    justifyContent: "center",
  },
});
