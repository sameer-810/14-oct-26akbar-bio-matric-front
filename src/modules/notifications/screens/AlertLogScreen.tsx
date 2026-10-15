import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { BellRing, Smartphone, Users, MessageSquare } from "lucide-react-native";

import { Screen, VStack, Text, DataTable, ChipsRow, ErrorState, Pagination, StatusChip, StatTile, Banner, useBreakpoint, type Column } from "@shared/ui";
import { formatDateTime } from "@shared/format";
import { useAlertLog, useAlertReach } from "../hooks/useNotifications";
import type { AlertLogRow, AlertStatus } from "../types";

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "sent", label: "Delivered" },
  { key: "no_device", label: "Could not reach" },
  { key: "failed", label: "Failed" },
  { key: "queued", label: "Waiting" },
  { key: "expired", label: "Too late" },
];

const CHANNEL: Record<string, string> = { push: "App", sms: "SMS", whatsapp: "WhatsApp", none: "—" };

/**
 * What went to which family and whether it arrived. "Could not reach" is a
 * family with no app on any phone and no SMS fallback — the people to ask to
 * install the app.
 */
export default function AlertLogScreen() {
  const { isWide } = useBreakpoint();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const log = useAlertLog({ status: filter === "all" ? undefined : (filter as AlertStatus), page });
  const reach = useAlertReach();
  const r = reach.data;

  const columns: Column<AlertLogRow>[] = [
    { key: "at", header: "When", flex: 1, render: (n) => <Text variant="body-sm">{formatDateTime(n.createdAt)}</Text> },
    {
      key: "who",
      header: "Student",
      flex: 1,
      render: (n) => (
        <Text variant="body-sm">
          {n.student ? `${n.student.name} (${n.student.grNumber})` : "—"}
          {n.parentUsername ? `\n${n.parentUsername}` : ""}
        </Text>
      ),
    },
    { key: "what", header: "Message", flex: 3, render: (n) => <Text variant="body-sm">{n.body}</Text> },
    {
      key: "status",
      header: "Result",
      flex: 1,
      render: (n) => (
        <VStack gap={2}>
          <StatusChip status={n.status === "sent" ? "delivered" : n.status} size="sm" />
          <Text variant="caption" tone="tertiary">
            {n.status === "sent" ? CHANNEL[n.channel ?? "none"] : n.lastError || ""}
          </Text>
        </VStack>
      ),
    },
  ];

  return (
    <Screen title="Parent alerts" subtitle="Every alert sent to families, and whether it arrived." testID="alert-log">
      <VStack gap={12}>
        {r ? (
          <View style={[styles.tiles, isWide && styles.tilesWide]}>
            <StatTile label="Families" value={r.adoption.families} icon={Users} />
            <StatTile label="Signed in to the app" value={r.adoption.signedIn} icon={Smartphone} />
            <StatTile label="Alerts on a phone" value={r.adoption.withPush} icon={BellRing} testID="tile-with-push" />
            <StatTile
              label="When there is no app"
              value={r.fallback === "none" ? "Nothing" : r.fallback === "sms" ? "SMS" : "WhatsApp"}
              icon={MessageSquare}
              attention={r.fallback === "none"}
            />
          </View>
        ) : null}
        {r && r.fallback === "none" ? (
          <Banner
            tone="warning"
            title="Families without the app get nothing"
            message="Set an SMS gateway or WhatsApp on the server (FALLBACK_CHANNEL) so they still hear when their child reaches class."
          />
        ) : null}
        <ChipsRow
          chips={FILTERS}
          active={filter}
          onChange={(k) => {
            setFilter(k);
            setPage(1);
          }}
        />
        {log.error ? <ErrorState error={log.error} onRetry={() => void log.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={log.data?.items ?? []}
          keyExtractor={(n) => n.id}
          emptyIcon={BellRing}
          emptyTitle={log.isLoading ? "Loading…" : "No alerts yet"}
          testID="alert-table"
        />
        {log.data && log.data.pages > 1 ? (
          <Pagination page={page} totalPages={log.data.pages} total={log.data.total} limit={50} onPageChange={setPage} />
        ) : null}
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 12 },
  tilesWide: { flexDirection: "row", flexWrap: "wrap" },
});
