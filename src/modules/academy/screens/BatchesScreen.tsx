import React, { useState } from "react";
import { Users } from "lucide-react-native";
import { Screen, VStack, HStack, Text, Card, Button, StatusChip, EmptyState, Skeleton, ErrorState, Banner } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useBatches, useStandards, useCurrentYear } from "../hooks/useAcademy";
import { BatchForm } from "../components/BatchForm";
import { dayLabels } from "../components/DaysPicker";

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/** This year's batches by standard, with their timing and strength. */
export default function BatchesScreen() {
  const year = useCurrentYear();
  const standards = useStandards();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.BATCHES_MANAGE));
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const byStandard = (standards.data ?? [])
    .map((s) => ({ standard: s, batches: (batches.data ?? []).filter((b) => b.standardId === s.id) }))
    .filter((g) => g.batches.length);

  return (
    <Screen
      title="Batches"
      subtitle={year ? `Academic year ${year.label}` : undefined}
      right={canManage && editing !== "new" ? <Button label="New batch" onPress={() => setEditing("new")} testID="batch-new" /> : undefined}
      testID="batches-screen"
    >
      <VStack gap={16}>
        {!year && !batches.isLoading ? <Banner tone="warning" message="Set the current academic year in Settings first." /> : null}
        {editing === "new" ? <BatchForm onDone={() => setEditing(null)} /> : null}
        {batches.isLoading ? <Skeleton height={120} /> : null}
        {batches.error ? <ErrorState error={batches.error} onRetry={() => void batches.refetch()} /> : null}
        {batches.data && batches.data.length === 0 ? <EmptyState icon={Users} title="No batches this year yet" /> : null}
        {byStandard.map(({ standard, batches: list }) => (
          <VStack key={standard.id} gap={8}>
            <Text variant="overline" tone="tertiary">
              {standard.name}
            </Text>
            {list.map((b) =>
              editing === b.id ? (
                <BatchForm key={b.id} batch={b} onDone={() => setEditing(null)} />
              ) : (
                <Card key={b.id} onPress={canManage ? () => setEditing(b.id) : undefined} testID={`batch-${b.name}`}>
                  <HStack gap={12} align="center" wrap>
                    <VStack gap={2} flex={1}>
                      <Text variant="h3">{b.name}</Text>
                      <Text variant="body-sm" tone="secondary">
                        {to12h(b.startTime)} – {to12h(b.endTime)} · {dayLabels(b.workingDays)}
                        {b.room ? ` · ${b.room}` : ""}
                      </Text>
                    </VStack>
                    <Text variant="metric-sm">{b.studentCount ?? 0}</Text>
                    <Text variant="caption" tone="tertiary">
                      students
                    </Text>
                    {!b.isActive ? <StatusChip status="inactive" size="sm" /> : null}
                  </HStack>
                </Card>
              ),
            )}
          </VStack>
        ))}
      </VStack>
    </Screen>
  );
}
