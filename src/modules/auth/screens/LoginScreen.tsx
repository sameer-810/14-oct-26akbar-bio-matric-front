import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Fingerprint, Eye, EyeOff } from "lucide-react-native";

import { Screen, Text, Card, VStack, HStack, Button, TextField, Banner, ChipsRow, useBreakpoint } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { useAuthStore, type Audience } from "@shared/store/useAuthStore";
import { authApi } from "../api/authApi";

/**
 * One sign-in screen with two doors. Staff and parents are different kinds of
 * account on the server; the toggle decides which door the request goes to,
 * so a parent typing a staff username simply gets "incorrect".
 */
export default function LoginScreen() {
  const { isWide } = useBreakpoint();
  const signedIn = useAuthStore((s) => s.signedIn);
  const [audience, setAudience] = useState<Audience>("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.login(audience, username.trim(), password);
      signedIn(audience, r.account, r.accessToken, r.refreshToken);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not sign in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen testID="login-screen">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={24}>
          <HStack gap={12} align="center">
            <View style={styles.mark}>
              <Fingerprint size={28} color={palette.text.inverse} />
            </View>
            <VStack gap={2} flex={1}>
              <Text variant="h1" heading={1}>
                Akbars Academy
              </Text>
              <Text tone="secondary">Sign in to continue</Text>
            </VStack>
          </HStack>

          <Card>
            <VStack gap={16}>
              <ChipsRow
                chips={[
                  { key: "staff", label: "Staff" },
                  { key: "parent", label: "Parent" },
                ]}
                active={audience}
                onChange={(k) => {
                  setAudience(k as Audience);
                  setError(null);
                }}
              />

              {error ? <Banner tone="danger" message={error} /> : null}

              <TextField
                label="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                placeholder={audience === "parent" ? "P12012" : "Your username"}
                hint={
                  audience === "parent"
                    ? "It is on the admission slip: P followed by your child's GR number."
                    : undefined
                }
                testID="login-username"
                onSubmitEditing={submit}
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                testID="login-password"
                onSubmitEditing={submit}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={palette.text.tertiary} />
                    ) : (
                      <Eye size={18} color={palette.text.tertiary} />
                    )}
                  </Pressable>
                }
              />
              <Button label="Sign in" onPress={submit} loading={busy} fullWidth testID="login-submit" />
              <Text variant="caption" tone="tertiary">
                {audience === "parent"
                  ? "Forgot your password? The academy office can give you a new slip."
                  : "Forgot your password? Ask the owner to reset it."}
              </Text>
            </VStack>
          </Card>
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
