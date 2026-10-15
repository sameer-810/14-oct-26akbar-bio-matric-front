import React from "react";
import { View, StyleSheet } from "react-native";
import { Bell, LogIn, LogOut, CircleSlash, CalendarCheck, Megaphone, Award, FileText, MessageCircleQuestion, IndianRupee } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatRelative, formatDateTime } from "@shared/format";
import { useInbox, useParentActions } from "../hooks/useParent";
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
          {(inbox.data?.items ?? []).map((m) => {
            const Icon = ICONS[m.type] ?? Bell;
            return (
              <Card key={m.id} accentColor={m.read ? undefined : palette.primary[600]} testID={`alert-${m.type}`}>
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
          })}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});
