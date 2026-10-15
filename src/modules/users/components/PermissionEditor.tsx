import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { Text, VStack } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { PERMISSION_LABELS, type Permission } from "@shared/permissions";

interface Props {
  assignable: string[];
  value: string[];
  roleDefaults: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Per-person adjustments on top of the role. Each row says whether it differs
 * from the role's default, so "why can Ayesha see fees?" has an answer on screen.
 */
export function PermissionEditor({ assignable, value, roleDefaults, onChange, disabled }: Props) {
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <VStack gap={2} role="group" accessibilityLabel="Permissions">
      {assignable.map((p) => {
        const on = value.includes(p);
        const differs = on !== roleDefaults.includes(p);
        return (
          <Pressable
            key={p}
            onPress={() => !disabled && toggle(p)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
            accessibilityLabel={PERMISSION_LABELS[p as Permission] ?? p}
            style={({ pressed }) => [styles.row, pressed && !disabled ? { backgroundColor: palette.ink[50] } : null]}
          >
            <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={14} color={palette.text.inverse} strokeWidth={3} /> : null}</View>
            <Text variant="body-sm" style={{ flex: 1 }}>
              {PERMISSION_LABELS[p as Permission] ?? p}
            </Text>
            {differs ? (
              <Text variant="caption" tone="warning">
                {on ? "added" : "removed"}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </VStack>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.sm, minHeight: 40 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: palette.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: palette.primary[600], borderColor: palette.primary[600] },
});
