import React, { useState } from "react";
import { CalendarCheck } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Banner, ChipsRow, StatusChip, Skeleton, ErrorState, EmptyState } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, formatDay, formatRelative } from "@shared/format";
import { useLeaveList, useAttendanceActions } from "../hooks/useAttendance";
import type { Leave } from "../types";

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
];

/**
 * Leave parents applied for in the app. Approving re-labels those days on the
 * register (absent → leave) and tells the parent; declining only tells them.
 */
export default function LeaveRequestsScreen() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  // decided ones: the last two months is plenty to look back on
  const [since] = useState(() => academyToday(Date.now() - 60 * 86_400_000));
  const list = useLeaveList(tab === "pending" ? { status: tab } : { status: tab, from: since });
  const pending = useLeaveList({ status: "pending" });
  const act = useAttendanceActions();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE));
  const [error, setError] = useState<string | null>(null);
  const rows = (list.data ?? []).filter((l) => tab !== "pending" || l.source === "parent");

  async function decide(l: Leave, approve: boolean) {
    setError(null);
    try {
      await act.decideLeave.mutateAsync({ id: l.id, approve });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Screen title="Leave requests" subtitle="Applied for by parents in the app" testID="leave-requests">
      <VStack gap={12}>
        <ChipsRow
          chips={TABS.map((t) => (t.key === "pending" ? { ...t, count: pending.data?.length ?? 0 } : t))}
          active={tab}
          onChange={(k) => setTab(k as typeof tab)}
        />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        {list.isLoading ? <Skeleton height={120} /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
        {list.data && rows.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={tab === "pending" ? "Nothing waiting" : "None"} message="New applications appear here as parents send them." />
        ) : null}
        {rows.map((l) => (
          <Card key={l.id} testID={`leave-request-${l.student?.grNumber ?? l.studentId}`}>
            <VStack gap={8}>
              <HStack gap={8} align="center" wrap>
                <Text variant="label" style={{ flex: 1 }}>
                  {l.student?.name ?? "Student"} {l.student ? `· GR ${l.student.grNumber}` : ""}
                </Text>
                <StatusChip status={l.status} size="sm" />
              </HStack>
              <Text variant="body-sm">
                {formatDay(l.from)}
                {l.to !== l.from ? ` – ${formatDay(l.to)}` : ""}
                {l.reason ? ` · ${l.reason}` : ""}
              </Text>
              <Text variant="caption" tone="tertiary">
                {l.source === "parent" ? "From the parent app" : "Entered by staff"}
                {l.createdAt ? ` · ${formatRelative(l.createdAt)}` : ""}
              </Text>
              {canManage && l.status === "pending" ? (
                <HStack gap={8}>
                  <Button label="Approve" size="sm" onPress={() => void decide(l, true)} testID="leave-approve" />
                  <Button label="Decline" size="sm" variant="secondary" onPress={() => void decide(l, false)} testID="leave-decline" />
                </HStack>
              ) : null}
            </VStack>
          </Card>
        ))}
      </VStack>
    </Screen>
  );
}
