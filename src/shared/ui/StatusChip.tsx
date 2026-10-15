import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { palette, radius } from "../designSystem";
import { Text } from "./Text";

/** State chip: neutral unless the state needs attention. */
type Palette = { bg: string; text: string; border: string };

const NEUTRAL: Palette = {
  bg: palette.surface.tertiary,
  text: palette.text.secondary,
  border: palette.border.default,
};
const BLUE: Palette = {
  bg: palette.info.bg,
  text: palette.info.text,
  border: palette.info.border,
};
const GREEN: Palette = {
  bg: palette.success.bg,
  text: palette.success.text,
  border: palette.success.border,
};
const AMBER: Palette = {
  bg: palette.warning.bg,
  text: palette.warning.text,
  border: palette.warning.border,
};
const RED: Palette = {
  bg: palette.danger.bg,
  text: palette.danger.text,
  border: palette.danger.border,
};

/** Every state mapped once; screens pass the state string rather than choosing colours. */
const STATE_COLORS: Record<string, Palette> = {
  // Attendance — the only place red/amber/green mean present/late/absent
  present: GREEN,
  late: AMBER,
  absent: RED,
  leave: BLUE,
  holiday: NEUTRAL,

  // Punch
  entry: GREEN,
  exit: BLUE,
  between: NEUTRAL,
  duplicate: NEUTRAL,
  ignored: NEUTRAL,
  stale: AMBER,

  // Device
  approved: GREEN,
  pending: AMBER,
  blocked: RED,
  online: GREEN,
  offline: RED,

  // Device command
  sent: BLUE,
  done: GREEN,
  failed: RED,
  cancelled: NEUTRAL,

  // Parent alert
  queued: NEUTRAL,
  delivered: GREEN,
  "no device": AMBER,

  // Leave application
  rejected: RED,

  // Exam
  draft: NEUTRAL,
  published: GREEN,

  // Student / account
  active: GREEN,
  inactive: NEUTRAL,
  expired: NEUTRAL,
  enrolled: GREEN,
  "not enrolled": AMBER,
};

interface Props {
  status: string;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

export function StatusChip({ status, size = "md", style }: Props) {
  // Raw codes ("in_consultation") and spaced labels ("in consultation") both work.
  const text = String(status || "")
    .replace(/_/g, " ")
    .trim();
  const key = text.toLowerCase();
  const c = STATE_COLORS[key] ?? NEUTRAL;
  const label = text.charAt(0).toUpperCase() + text.slice(1);

  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: c.bg, borderColor: c.border },
        style,
      ]}
    >
      <Text
        variant={size === "sm" ? "label-sm" : "label"}
        weight="500"
        style={{ color: c.text }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm, borderWidth: 1, alignSelf: "flex-start" },
  sm: { paddingHorizontal: 6, paddingVertical: 1 },
  md: { paddingHorizontal: 8, paddingVertical: 3 },
});
