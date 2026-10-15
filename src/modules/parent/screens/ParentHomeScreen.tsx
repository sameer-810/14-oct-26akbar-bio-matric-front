import React from "react";
import { View, StyleSheet } from "react-native";
import { CheckCircle2, Clock, LogOut, CircleSlash } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, SectionHeader, StatusChip, Skeleton, ErrorState, EmptyState, StatTile, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatTime, formatDay } from "@shared/format";
import { useSelectedChild, useChildToday, useOverview, useParentSettings } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";
import { DAY_LABELS, DAY_COLORS, to12h, hoursAndMinutes } from "../components/dayStatus";
import type { Child, ChildToday } from "../types";

/**
 * The first thing a parent opens: did my child reach class, when did they
 * leave, and how is the attendance this week, month and year.
 */
export default function ParentHomeScreen() {
  const { isWide } = useBreakpoint();
  const { child, isLoading, error } = useSelectedChild();
  const settings = useParentSettings();
  const today = useChildToday(child?.id);
  const overview = useOverview(child?.id);

  return (
    <Screen
      title={child ? child.name : "Home"}
      subtitle={child ? `GR ${child.grNumber}${child.batch ? ` · ${child.batch.name}` : ""}` : settings.data?.academy}
      onRefresh={() => {
        void today.refetch();
        void overview.refetch();
      }}
      refreshing={today.isRefetching}
      testID="parent-home"
    >
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={16}>
          <ChildPicker />
          {isLoading ? <Skeleton height={180} /> : null}
          {error ? <ErrorState error={error} /> : null}
          {!isLoading && !error && !child ? (
            <EmptyState title="No child linked" message="Please contact the academy to link your child to this login." />
          ) : null}
          {child && today.data ? <TodayCard child={child} today={today.data} /> : child ? <Skeleton height={160} /> : null}

          {overview.data ? (
            <View style={[styles.tiles, isWide && styles.tilesWide]}>
              {(["week", "month", "year"] as const).map((k) => (
                <StatTile
                  key={k}
                  label={k === "week" ? "This week" : k === "month" ? "This month" : "This year"}
                  value={overview.data[k].percent === null ? "—" : `${overview.data[k].percent}%`}
                  sublabel={`${overview.data[k].counts.absent ?? 0} absent · ${overview.data[k].counts.late ?? 0} late`}
                  testID={`parent-percent-${k}`}
                />
              ))}
            </View>
          ) : null}
        </VStack>
      </View>
    </Screen>
  );
}

function TodayCard({ child, today }: { child: Child; today: ChildToday }) {
  const s = today.status;
  const headline = !s
    ? today.entryAt
      ? "In class"
      : "Not in yet"
    : s === "present" || s === "late"
      ? today.exitAt
        ? `Left at ${formatTime(today.exitAt)}`
        : `In class since ${formatTime(today.entryAt)}`
      : DAY_LABELS[s];
  const Icon = s === "absent" ? CircleSlash : today.exitAt ? LogOut : today.entryAt ? CheckCircle2 : Clock;
  const tone = s ? DAY_COLORS[s] : { bg: palette.surface.secondary, text: palette.text.secondary };

  return (
    <Card testID="parent-today">
      <VStack gap={12}>
        <SectionHeader title={`Today · ${formatDay(today.date)}`} right={s ? <StatusChip status={DAY_LABELS[s]} /> : null} />
        <HStack gap={12} align="center">
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Icon size={26} color={tone.text} />
          </View>
          <VStack gap={2} flex={1}>
            <Text variant="h2" testID="parent-today-headline">
              {headline}
            </Text>
            {child.batch ? (
              <Text tone="secondary" variant="body-sm">
                Class {to12h(child.batch.startTime)} – {to12h(child.batch.endTime)}
              </Text>
            ) : null}
          </VStack>
        </HStack>
        {today.entryAt ? (
          <HStack gap={16} wrap>
            <Text variant="body-sm">Reached {formatTime(today.entryAt)}</Text>
            {today.exitAt ? <Text variant="body-sm">Left {formatTime(today.exitAt)}</Text> : null}
            {today.durationMinutes !== null ? <Text variant="body-sm">In class {hoursAndMinutes(today.durationMinutes)}</Text> : null}
          </HStack>
        ) : null}

        {today.punches && today.punches.length > 0 ? (
          <VStack gap={4}>
            <Text variant="label">Fingerprint punches</Text>
            <Text variant="body-sm" tone="secondary" testID="parent-punches">
              {today.punches.map((p) => formatTime(p)).join(" · ")}
            </Text>
          </VStack>
        ) : null}

        {today.lectures && today.lectures.length > 0 ? (
          <VStack gap={6}>
            <Text variant="label">Lectures</Text>
            {today.lectures.map((l) => (
              <HStack key={`${l.startTime}-${l.subject}`} gap={8} align="center">
                <Text variant="body-sm" style={{ flex: 1 }}>
                  {to12h(l.startTime)} {l.subject || "Lecture"}
                </Text>
                <StatusChip status={l.status ?? "upcoming"} size="sm" />
              </HStack>
            ))}
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  tiles: { gap: 12 },
  tilesWide: { flexDirection: "row" },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
