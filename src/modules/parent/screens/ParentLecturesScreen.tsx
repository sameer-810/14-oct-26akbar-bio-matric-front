import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, StatusChip, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { academyToday, addDaysTo, formatDay, formatWallTime } from "@shared/format";
import { useSelectedChild, useChildLectures } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";
import type { ChildLecture } from "../types";

/** Monday of the week holding `ymd`. */
function monday(ymd: string) {
  const day = new Date(`${ymd}T12:00:00`).getDay();
  return addDaysTo(ymd, -((day + 6) % 7));
}

/**
 * A week of lectures with the child's mark on each — the old app's
 * "Schedules" and "Attendance" screens. Present/absent comes from the
 * fingerprint or the teacher; a lecture not yet marked shows its time only.
 */
export default function ParentLecturesScreen() {
  const { isWide } = useBreakpoint();
  const { child } = useSelectedChild();
  const thisWeek = monday(academyToday());
  const [from, setFrom] = useState(thisWeek);
  const to = addDaysTo(from, 6);
  const lectures = useChildLectures(child?.id, from, to);

  const byDay = new Map<string, ChildLecture[]>();
  for (const l of lectures.data ?? []) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l]);
  const taken = (lectures.data ?? []).filter((l) => l.status);
  const present = taken.filter((l) => l.status === "present").length;

  return (
    <Screen title="Lectures" subtitle={child?.name} testID="parent-lectures">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          <ChildPicker />
          <HStack align="center" gap={8}>
            <Pressable onPress={() => setFrom(addDaysTo(from, -7))} accessibilityRole="button" accessibilityLabel="Previous week" style={styles.nav} testID="lectures-prev">
              <ChevronLeft size={20} color={palette.text.primary} />
            </Pressable>
            <Text variant="h3" style={{ flex: 1 }} center>
              {formatDay(from)} – {formatDay(to)}
            </Text>
            <Pressable onPress={() => setFrom(addDaysTo(from, 7))} accessibilityRole="button" accessibilityLabel="Next week" style={styles.nav} testID="lectures-next">
              <ChevronRight size={20} color={palette.text.primary} />
            </Pressable>
            {from !== thisWeek ? <Button label="This week" size="xs" variant="ghost" onPress={() => setFrom(thisWeek)} /> : null}
          </HStack>
          {taken.length ? (
            <Text tone="secondary" testID="lectures-summary">
              Present in {present} of {taken.length} lectures marked this week
            </Text>
          ) : null}

          {lectures.isLoading ? <Skeleton height={160} /> : null}
          {lectures.error ? <ErrorState error={lectures.error} onRetry={() => void lectures.refetch()} /> : null}
          {lectures.data?.length === 0 ? <EmptyState icon={BookOpen} title="No lectures this week" message="The timetable appears here once the academy plans it." /> : null}

          {[...byDay].map(([date, list]) => (
            <Card key={date} testID={`lectures-day-${date}`}>
              <VStack gap={10}>
                <Text variant="h3">{formatDay(date)}</Text>
                {list.map((l) => (
                  <HStack key={l.id} gap={10} align="flex-start">
                    <VStack gap={2} flex={1}>
                      <Text variant="body" style={l.cancelled ? styles.struck : undefined}>
                        {l.subject || "Lecture"} · {formatWallTime(l.startTime)}–{formatWallTime(l.endTime)}
                      </Text>
                      {l.teacher ? <Text variant="caption" tone="tertiary">{l.teacher}</Text> : null}
                      {l.topics ? <Text variant="body-sm" tone="secondary">Topics: {l.topics}</Text> : null}
                      {l.cancelled ? <Text variant="body-sm" tone="secondary">Cancelled{l.cancelReason ? `: ${l.cancelReason}` : ""}</Text> : null}
                    </VStack>
                    {l.cancelled ? <StatusChip status="cancelled" size="sm" /> : l.status ? <StatusChip status={l.status} size="sm" /> : null}
                  </HStack>
                ))}
              </VStack>
            </Card>
          ))}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  nav: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  struck: { textDecorationLine: "line-through", color: palette.text.tertiary },
});
