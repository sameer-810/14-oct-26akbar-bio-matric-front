import React, { useState } from "react";
import { ScrollText } from "lucide-react-native";

import { Screen, VStack, Text, DataTable, ChipsRow, ErrorState, Pagination, type Column } from "@shared/ui";
import { formatDateTime } from "@shared/format";
import { useAuditTrail } from "../hooks/useAudit";
import type { AuditEntry } from "../api/auditApi";

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "auth.login", label: "Sign-ins" },
  { key: "auth.login_failed", label: "Failed sign-ins" },
  { key: "device.approved", label: "Machines approved" },
  { key: "user.created", label: "Logins created" },
];

/** Who did what, from where. Append-only on the server; nothing here edits it. */
export default function AuditTrailScreen() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const trail = useAuditTrail({ action: filter === "all" ? undefined : filter, page });

  const columns: Column<AuditEntry>[] = [
    { key: "at", header: "When", flex: 1, render: (a) => <Text variant="body-sm">{formatDateTime(a.at)}</Text> },
    {
      key: "who",
      header: "Who",
      flex: 1,
      render: (a) => (
        <Text variant="body-sm">
          {a.actorName || a.actorType}
          {a.actorType === "parent" ? " (parent)" : ""}
        </Text>
      ),
    },
    {
      key: "what",
      header: "What",
      flex: 2,
      render: (a) => (
        <Text variant="body-sm">
          {a.action}
          {a.summary ? ` — ${a.summary}` : ""}
        </Text>
      ),
    },
    { key: "ip", header: "Address", flex: 1, render: (a) => <Text variant="body-sm" tone="tertiary">{a.ip || "—"}</Text> },
  ];

  return (
    <Screen title="Audit trail" subtitle="Every sign-in and every change, with who made it." testID="audit-screen">
      <VStack gap={12}>
        <ChipsRow
          chips={FILTERS}
          active={filter}
          onChange={(k) => {
            setFilter(k);
            setPage(1);
          }}
        />
        {trail.error ? <ErrorState error={trail.error} onRetry={() => void trail.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={trail.data?.data ?? []}
          keyExtractor={(a) => a.id}
          emptyIcon={ScrollText}
          emptyTitle={trail.isLoading ? "Loading…" : "Nothing recorded yet"}
          testID="audit-table"
        />
        {trail.data && trail.data.meta.pages > 1 ? (
          <Pagination page={page} totalPages={trail.data.meta.pages} total={trail.data.meta.total} limit={50} onPageChange={setPage} />
        ) : null}
      </VStack>
    </Screen>
  );
}
