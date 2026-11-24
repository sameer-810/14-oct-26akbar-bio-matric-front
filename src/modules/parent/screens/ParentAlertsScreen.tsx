import React from "react";
import { View, StyleSheet } from "react-native";
import { Bell, LogIn, LogOut, CircleSlash, CalendarCheck, Megaphone, Award, FileText, MessageCircleQuestion, IndianRupee } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatRelative, formatDateTime, formatDay, formatTime } from "@shared/format";
import { useInbox, useParentActions, useSelectedChild } from "../hooks/useParent";
import { toAlertRows, type DayRow } from "../alertRows";
import type { ParentMessage } from "../types";

const ICONS: Record<ParentMessage["type"], typeof Bell> = {
  entry: LogIn,
  exit: LogOut,
  absent: CircleSlash,
  leave: CalendarCheck,
  notice: Megaphone,
  message: Bell,
  exam: Award,
  document: FileText,
  issue: MessageCircleQuestion,
  fee: IndianRupee,
};

/**
 * Every alert the academy sent this family — the same words as the push
 * notification or SMS, kept here so nothing is lost when the phone was off.
 */
export default function ParentAlertsScreen() {
  const { isWide } = useBreakpoint();
  const inbox = useInbox();
  const act = useParentActions();
  const unread = inbox.data?.unread ?? 0;
  const { children } = useSelectedChild();
  const nameOf = (id: string | null) => children.find((c) => c.id === id)?.name ?? "Your child";
  const rows = toAlertRows(inbox.data?.items ?? []);

  return (
    <Screen
      title="Alerts"
      subtitle={unread ? `${unread} new` : undefined}
      right={unread ? <Button label="Mark all read" size="sm" variant="secondary" onPress={() => act.markRead.mutate(undefined)} testID="alerts-read-all" /> : null}
      onRefresh={() => void inbox.refetch()}
      refreshing={inbox.isRefetching}
      testID="parent-alerts"
    >
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={10}>
          {inbox.isLoading ? <Skeleton height={200} /> : null}
          {inbox.error ? <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} /> : null}
          {inbox.data && inbox.data.items.length === 0 ? (
            <EmptyState icon={Bell} title="No alerts yet" message="You will see here when your child reaches and leaves class." />
          ) : null}
          {rows.map((r) =>
            r.kind === "day" ? (
              <DayCard key={r.key} row={r} name={nameOf(r.studentId)} />
            ) : (
              <MessageCard key={r.key} m={r.message} />
            ),
          )}
        </VStack>
      </View>
    </Screen>
  );
}

/** One alert as the academy sent it. */
function MessageCard({ m }: { m: ParentMessage }) {
  const Icon = ICONS[m.type] ?? Bell;
  return (
    <Card accentColor={m.read ? undefined : palette.primary[600]} testID={`alert-${m.type}`}>
      <HStack gap={12} align="flex-start">
        <Icon size={20} color={m.type === "absent" ? palette.danger.text : palette.text.secondary} />
        <VStack gap={4} flex={1}>
          <HStack gap={8} align="center">
            <Text variant="label" weight={m.read ? "500" : "600"} style={{ flex: 1 }}>
              {m.title}
            </Text>
            <Text variant="caption" tone="tertiary" accessibilityLabel={formatDateTime(m.createdAt)}>
              {formatRelative(m.createdAt)}
            </Text>
          </HStack>
          <Text variant="body-sm" tone="secondary">
            {m.body}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

/** A child's day in one line: when they reached class and when they left, or Pending. */
function DayCard({ row, name }: { row: DayRow; name: string }) {
  const reached = row.reachedAt ? formatTime(row.reachedAt) : "Pending";
  const left = row.leftAt ? formatTime(row.leftAt) : "Pending";
  return (
    <Card accentColor={row.read ? undefined : palette.primary[600]} testID="alert-day">
      <HStack gap={12} align="flex-start">
        <LogIn size={20} color={palette.text.secondary} />
        <VStack gap={4} flex={1}>
          <HStack gap={8} align="center">
            <Text variant="label" weight={row.read ? "500" : "600"} style={{ flex: 1 }}>
              {name} · {formatDay(row.date)}
            </Text>
            <Text variant="caption" tone="tertiary" accessibilityLabel={formatDateTime(row.createdAt)}>
              {formatRelative(row.createdAt)}
            </Text>
          </HStack>
          <Text
            variant="body-sm"
            tone="secondary"
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={`Reached class ${row.reachedAt ? `at ${reached}` : "pending"}, left class ${row.leftAt ? `at ${left}` : "pending"}`}
            testID="alert-day-line"
          >
            Student Reached: <Text variant="body-sm" weight="600" tone={row.reachedAt ? "primary" : "warning"}>{reached}</Text>
            {"  |  "}
            Student Left: <Text variant="body-sm" weight="600" tone={row.leftAt ? "primary" : "warning"}>{left}</Text>
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});
