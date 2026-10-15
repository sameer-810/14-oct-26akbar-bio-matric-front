import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Skeleton, ErrorState, useBreakpoint } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { academyToday, formatDay, formatTime } from "@shared/format";
import { useSelectedChild, useChildDays } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";
import { DAY_COLORS, DAY_LABELS, hoursAndMinutes } from "../components/dayStatus";
import type { DayStatus } from "../types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Monday = 0 for the first of the month. */
const firstWeekday = (y: number, m: number) => (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

/** A month at a time, coloured by day — the old app's calendar, with the times on tap. */
export default function ParentCalendarScreen() {
  const { isWide } = useBreakpoint();
  const today = academyToday();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [picked, setPicked] = useState<string | null>(null);
  const { child } = useSelectedChild();

  const from = `${ym.y}-${pad(ym.m)}-01`;
  const last = `${ym.y}-${pad(ym.m)}-${pad(daysIn(ym.y, ym.m))}`;
  const to = last < today ? last : today;
  const future = from > today;
  const days = useChildDays(future ? undefined : child?.id, from, to);
  const byDate = new Map((days.data?.days ?? []).map((d) => [d.date, d]));
  const isThisMonth = today.startsWith(`${ym.y}-${pad(ym.m)}`);

  const shift = (delta: number) => {
    setPicked(null);
    setYm(({ y, m }) => {
      const n = (y * 12 + (m - 1) + delta);
      return { y: Math.floor(n / 12), m: (n % 12) + 1 };
    });
  };

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday(ym.y, ym.m) }, () => null),
    ...Array.from({ length: daysIn(ym.y, ym.m) }, (_, i) => `${ym.y}-${pad(ym.m)}-${pad(i + 1)}`),
  ];
  const sel = picked ? byDate.get(picked) : undefined;

  return (
    <Screen title="Calendar" subtitle={child?.name} testID="parent-calendar">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={16}>
          <ChildPicker />
          <Card>
            <VStack gap={12}>
              <HStack align="center" gap={8}>
                <Pressable onPress={() => shift(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.nav}>
                  <ChevronLeft size={20} color={palette.text.primary} />
                </Pressable>
                <Text variant="h3" center style={{ flex: 1 }} testID="calendar-month">
                  {MONTHS[ym.m - 1]} {ym.y}
                </Text>
                <Pressable
                  onPress={() => shift(1)}
                  disabled={isThisMonth}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  style={[styles.nav, isThisMonth && { opacity: 0.3 }]}
                >
                  <ChevronRight size={20} color={palette.text.primary} />
                </Pressable>
              </HStack>

              {days.data ? (
                <HStack gap={12} wrap>
                  <Text variant="metric" testID="calendar-percent">
                    {days.data.percent === null ? "—" : `${days.data.percent}%`}
                  </Text>
                  <Text variant="body-sm" tone="secondary" style={{ alignSelf: "center" }}>
                    {days.data.counts.present ?? 0} present · {days.data.counts.late ?? 0} late · {days.data.counts.absent ?? 0} absent ·{" "}
                    {days.data.counts.leave ?? 0} leave
                  </Text>
                </HStack>
              ) : null}

              <View style={styles.grid}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={styles.cellWrap}>
                    <Text variant="caption" tone="tertiary" center>
                      {w}
                    </Text>
                  </View>
                ))}
                {cells.map((d, i) => {
                  const row = d ? byDate.get(d) : undefined;
                  const c = row ? DAY_COLORS[row.status] : null;
                  return (
                    <View key={d ?? `blank-${i}`} style={styles.cellWrap}>
                      {d ? (
                        <Pressable
                          onPress={() => setPicked(d)}
                          accessibilityRole="button"
                          accessibilityLabel={`${formatDay(d)}${row ? ` ${DAY_LABELS[row.status]}` : ""}`}
                          style={[
                            styles.cell,
                            c && { backgroundColor: c.bg },
                            d === today && styles.today,
                            d === picked && styles.picked,
                          ]}
                          testID={row ? `day-${d}-${row.status}` : undefined}
                        >
                          <Text variant="body-sm" style={{ color: c?.text ?? palette.text.tertiary }} center>
                            {Number(d.slice(8))}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {days.isLoading ? <Skeleton height={24} /> : null}
              {days.error ? <ErrorState error={days.error} onRetry={() => void days.refetch()} /> : null}

              <HStack gap={10} wrap>
                {(Object.keys(DAY_COLORS) as DayStatus[]).map((k) => (
                  <HStack key={k} gap={4} align="center">
                    <View style={[styles.swatch, { backgroundColor: DAY_COLORS[k].bg, borderColor: DAY_COLORS[k].text }]} />
                    <Text variant="caption" tone="secondary">
                      {DAY_LABELS[k]}
                    </Text>
                  </HStack>
                ))}
              </HStack>
            </VStack>
          </Card>

          {picked ? (
            <Card testID="calendar-day">
              <VStack gap={4}>
                <Text variant="h3">{formatDay(picked)}</Text>
                {sel ? (
                  <>
                    <Text style={{ color: DAY_COLORS[sel.status].text }}>{DAY_LABELS[sel.status]}</Text>
                    {sel.entryAt ? (
                      <Text variant="body-sm" tone="secondary">
                        Reached {formatTime(sel.entryAt)}
                        {sel.exitAt ? ` · left ${formatTime(sel.exitAt)}` : ""}
                        {sel.durationMinutes !== null ? ` · ${hoursAndMinutes(sel.durationMinutes)}` : ""}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text tone="secondary">No class that day.</Text>
                )}
              </VStack>
            </Card>
          ) : null}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  nav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 2, borderColor: palette.primary[600] },
  picked: { borderWidth: 2, borderColor: palette.text.primary },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
});
