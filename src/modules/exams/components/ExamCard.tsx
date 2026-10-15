import React from "react";
import { Card, VStack, HStack, Text, StatusChip } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatDay, formatWallTime } from "@shared/format";
import { examChipStatus, showMarks, type Exam } from "../types";

/** One test in the list: what, when, for whom, and how it went so far. */
export function ExamCard({ exam: e, today, onOpen }: { exam: Exam; today: string; onOpen: () => void }) {
  const chip = examChipStatus(e, today);
  const s = e.stats;
  return (
    <Card
      onPress={onOpen}
      accentColor={chip === "pending" ? palette.warning.text : undefined}
      accessibilityLabel={`${e.name}, ${formatDay(e.date)}, ${chip}`}
      testID={`exam-card-${e.name}`}
    >
      <VStack gap={6}>
        <HStack gap={8} align="center" wrap>
          <Text variant="h3" style={{ flex: 1 }}>
            {e.name}
            {e.subject ? <Text variant="h3" tone="secondary">{` · ${e.subject}`}</Text> : null}
          </Text>
          <StatusChip status={chip} size="sm" />
        </HStack>
        <Text variant="body-sm" tone="secondary">
          {formatDay(e.date)}
          {e.startTime ? ` · ${formatWallTime(e.startTime)}` : ""}
          {e.batchNames?.length ? ` · ${e.batchNames.filter(Boolean).join(", ")}` : ""}
        </Text>
        <Text variant="caption" tone="tertiary" tabular>
          Out of {e.maxMarks} · pass {e.passingMarks}
          {/* the list counts only entered results, so it cannot tell who is still missing */}
          {s && (s.appeared || s.absent) ? ` · ${s.appeared} appeared · average ${showMarks(s.average)}` : " · no marks yet"}
        </Text>
        {e.status === "cancelled" && e.cancelReason ? (
          <Text variant="caption" tone="tertiary">
            Cancelled: {e.cancelReason}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}
