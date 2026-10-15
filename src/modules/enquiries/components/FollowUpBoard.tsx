import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { VStack, HStack, Text, Button, Select, Skeleton, ErrorState, useBreakpoint } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, addDaysTo, formatDay } from "@shared/format";
import { useEnquiryAssignees, useFollowUpBoard } from "../hooks/useEnquiries";
import { mondayOf, weekdayOf } from "../enquiryDates";
import { TaskCard } from "./TaskCard";
import type { EnquiryTask } from "../types";

const COLUMN = 260;

/**
 * The old weekly follow-up board: what is overdue from before, then the
 * week's calls day by day. Side by side on a wide screen, one under the
 * other on a phone.
 */
export function FollowUpBoard({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { isPhone } = useBreakpoint();
  const seeAll = useAuthStore((s) => s.hasPermission(PERMISSIONS.ENQUIRIES_ALL));
  // read once: the clock must not be read while rendering
  const [today] = useState(() => academyToday());
  const [now] = useState(() => Date.now());
  const [thisWeek] = useState(() => mondayOf(academyToday()));
  const [week, setWeek] = useState(thisWeek);
  const [assigneeId, setAssigneeId] = useState("");

  const assignees = useEnquiryAssignees({ enabled: seeAll });
  const board = useFollowUpBoard({ week, assigneeId: assigneeId || undefined });
  const b = board.data;
  const showAssignee = seeAll && !assigneeId;
  const empty = b ? b.overdue.length === 0 && b.days.every((d) => d.tasks.length === 0) : false;

  const column = (key: string, title: string, tasks: EnquiryTask[], tone: "danger" | "today" | "plain", testID: string) => (
    <View
      key={key}
      style={[styles.column, isPhone ? null : { width: COLUMN }, tone === "danger" && styles.overdue, tone === "today" && styles.today]}
      testID={testID}
    >
      <HStack gap={8} align="center" style={{ marginBottom: 8 }}>
        <Text variant="label" weight="600" tone={tone === "danger" ? "danger" : "primary"} style={{ flex: 1 }}>
          {title}
        </Text>
        <Text variant="caption" tone={tone === "danger" ? "danger" : "tertiary"} tabular>
          {tasks.length}
        </Text>
      </HStack>
      <VStack gap={8}>
        {tasks.length === 0 ? (
          <Text variant="caption" tone="tertiary">
            Nothing
          </Text>
        ) : null}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} now={now} showLead showAssignee={showAssignee} timeOnly={key !== "overdue"} onOpenLead={onOpenLead} />
        ))}
      </VStack>
    </View>
  );

  const columns = b
    ? [
        column("overdue", "Overdue", b.overdue, "danger", "board-overdue"),
        ...b.days.map((d) =>
          column(d.date, `${weekdayOf(d.date)} ${formatDay(d.date).replace(/ \d{4}$/, "")}`, d.tasks, d.date === today ? "today" : "plain", `board-day-${d.date}`),
        ),
      ]
    : [];

  return (
    <VStack gap={12}>
      <HStack gap={12} wrap align="center">
        <HStack align="center" gap={4} style={{ flex: 1, minWidth: 260 }}>
          <Pressable onPress={() => setWeek(addDaysTo(week, -7))} accessibilityRole="button" accessibilityLabel="Previous week" style={styles.nav} testID="board-prev">
            <ChevronLeft size={20} color={palette.text.primary} />
          </Pressable>
          <Text variant="h3" center style={{ flex: 1 }}>
            {formatDay(week)} – {formatDay(addDaysTo(week, 6))}
          </Text>
          <Pressable onPress={() => setWeek(addDaysTo(week, 7))} accessibilityRole="button" accessibilityLabel="Next week" style={styles.nav} testID="board-next">
            <ChevronRight size={20} color={palette.text.primary} />
          </Pressable>
          {week !== thisWeek ? <Button label="This week" size="xs" variant="ghost" fullWidth={false} onPress={() => setWeek(thisWeek)} /> : null}
        </HStack>
        {seeAll ? (
          <View style={{ minWidth: 220, flex: 1 }} testID="board-person">
            <Select
              value={assigneeId || null}
              options={[{ value: "", label: "Everyone" }, ...(assignees.data ?? []).map((a) => ({ value: a.id, label: a.name, sublabel: a.role.replace(/_/g, " ") }))]}
              onChange={setAssigneeId}
              placeholder="Everyone"
            />
          </View>
        ) : null}
      </HStack>

      {board.isLoading ? <Skeleton height={200} /> : null}
      {board.error ? <ErrorState error={board.error} onRetry={() => void board.refetch()} /> : null}
      {empty ? (
        <Text variant="body-sm" tone="tertiary">
          {"No follow-ups this week. Add one from a lead's page."}
        </Text>
      ) : null}
      {b ? (
        isPhone ? (
          <VStack gap={12}>{columns}</VStack>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 12, paddingBottom: 8, alignItems: "flex-start" }}>
            {columns}
          </ScrollView>
        )
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  nav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  column: {
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border.default,
    backgroundColor: palette.surface.secondary,
  },
  overdue: { borderColor: palette.danger.border, backgroundColor: palette.danger.bg },
  today: { borderColor: palette.primary[300], backgroundColor: palette.primary[50] },
});
