import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import type { DayKey } from "../types";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

/** The days a batch meets. A day not ticked is never marked absent. */
export function DaysPicker({ value, onChange }: { value: DayKey[]; onChange: (v: DayKey[]) => void }) {
  return (
    <View style={styles.row} role="group" accessibilityLabel="Working days">
      {DAYS.map((d) => {
        const on = value.includes(d.key);
        return (
          <Pressable
            key={d.key}
            onPress={() => onChange(on ? value.filter((x) => x !== d.key) : [...value, d.key])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={d.label}
            style={[styles.day, on && styles.dayOn]}
          >
            <Text variant="label" style={{ color: on ? palette.text.inverse : palette.text.secondary }}>
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const dayLabels = (days: DayKey[]) =>
  DAYS.filter((d) => days.includes(d.key))
    .map((d) => d.label)
    .join(" ");

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface.primary,
  },
  dayOn: { backgroundColor: palette.primary[600], borderColor: palette.primary[600] },
});
