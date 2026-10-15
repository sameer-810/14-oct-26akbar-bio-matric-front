import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import type { Counts } from "../types";

const TONES = {
  present: palette.success,
  late: palette.warning,
  absent: palette.danger,
  leave: palette.info,
  notYet: { bg: palette.surface.tertiary, text: palette.text.secondary, border: palette.border.default },
} as const;

const LABELS = { present: "In", late: "Late", absent: "Absent", leave: "Leave", notYet: "Not yet" } as const;

/** In / late / absent / leave / not yet, in the same colours everywhere attendance appears. */
export function CountsRow({ counts, notYet }: { counts: Counts; notYet?: number }) {
  const items: [keyof typeof TONES, number][] = [
    ["present", counts.present ?? 0],
    ["late", counts.late ?? 0],
    ["absent", counts.absent ?? 0],
    ["leave", counts.leave ?? 0],
  ];
  if (notYet !== undefined) items.push(["notYet", notYet]);
  return (
    <View style={styles.row}>
      {items.map(([k, n]) => (
        <View key={k} style={[styles.pill, { backgroundColor: TONES[k].bg, borderColor: TONES[k].border }]} accessibilityLabel={`${LABELS[k]} ${n}`}>
          <Text variant="metric-sm" style={{ color: TONES[k].text }}>
            {n}
          </Text>
          <Text variant="caption" style={{ color: TONES[k].text }}>
            {LABELS[k]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { minWidth: 64, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1, alignItems: "center" },
});
