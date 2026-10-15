import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { academyToday } from "@shared/format";
import type { CalendarDay } from "../types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The old calendar: how many lectures each day of the month, tap a day to open it. */
export function MonthCounts({ month, days, onPick }: { month: string; days: CalendarDay[]; onPick: (date: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const by = new Map(days.map((d) => [d.date, d]));
  const today = academyToday();
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <View style={styles.grid}>
      {WEEKDAYS.map((w) => (
        <View key={w} style={styles.cellWrap}>
          <Text variant="caption" tone="tertiary" center>
            {w}
          </Text>
        </View>
      ))}
      {cells.map((d, i) => {
        const c = d ? by.get(d) : undefined;
        return (
          <View key={d ?? `x${i}`} style={styles.cellWrap}>
            {d ? (
              <Pressable
                onPress={() => onPick(d)}
                accessibilityRole="button"
                accessibilityLabel={`${d}: ${c?.scheduled ?? 0} lectures${c?.cancelled ? `, ${c.cancelled} cancelled` : ""}`}
                style={[styles.cell, c?.scheduled ? styles.busy : null, d === today && styles.today]}
                testID={`cal-${d}`}
              >
                <Text variant="caption" tone="tertiary">
                  {Number(d.slice(8))}
                </Text>
                <Text variant="label" tone={c?.scheduled ? "primary" : "disabled"}>
                  {c?.scheduled ?? "·"}
                </Text>
                {c?.cancelled ? (
                  <Text variant="caption" tone="danger">
                    −{c.cancelled}
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { minHeight: 64, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border.default, padding: 6, gap: 2 },
  busy: { backgroundColor: palette.primary[50] },
  today: { borderColor: palette.primary[600], borderWidth: 2 },
});
