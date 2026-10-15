import React from "react";
import { View, StyleSheet } from "react-native";
import { VStack, Text, Banner } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";

/**
 * Shown exactly once, right after a login is created or reset. The server
 * keeps only a hash; once this screen is left, nobody can read it again —
 * which is the point (the previous system showed parents' passwords to every
 * staff member, indefinitely).
 */
export function TemporaryPasswordPanel({ username, password }: { username: string; password: string }) {
  return (
    <VStack gap={10} testID="temporary-password">
      <Banner
        tone="warning"
        title="Write this down now"
        message="It will not be shown again. They will be asked to choose their own password the first time they sign in."
      />
      <View style={styles.box}>
        <Text variant="label" tone="secondary">
          Username
        </Text>
        <Text variant="h3" selectable testID="temporary-username">
          {username}
        </Text>
        <Text variant="label" tone="secondary" style={{ marginTop: 8 }}>
          Temporary password
        </Text>
        <Text variant="h2" selectable style={styles.mono} testID="temporary-password-value">
          {password}
        </Text>
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: palette.border.strong,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: palette.surface.primary,
  },
  mono: { fontFamily: "monospace", letterSpacing: 2 },
});
