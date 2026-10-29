import React, { useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { Users, Eye, Pencil, Trash2 } from "lucide-react-native";
import { Screen, VStack, HStack, Text, Card, Button, StatusChip, EmptyState, Skeleton, ErrorState, Banner, SearchInput, Select, ChipsRow, ConfirmDialog } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { useFilters } from "@shared/useFilters";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useBatches, useStandards, useCurrentYear, useRemoveBatch } from "../hooks/useAcademy";
import { BatchForm } from "../components/BatchForm";
import { dayLabels } from "../components/DaysPicker";
import { to12h } from "../components/batchTime";
import type { Batch } from "../types";
import type { BatchesParamList } from "../BatchesNavigator";

/** This year's batches by standard, with their timing and strength. */
export default function BatchesScreen() {
  const year = useCurrentYear();
  const standards = useStandards();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.BATCHES_MANAGE));
  const canAssign = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const navigation = useNavigation<NavigationProp<BatchesParamList>>();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const remove = useRemoveBatch();
  const { filters, set, reset, isFiltered } = useFilters("batches", { search: "", standardId: "", state: "all" });
  const needle = filters.search.trim().toLowerCase();
  const matchesState = (b: { isActive: boolean; studentCount?: number }) =>
    filters.state === "all" ||
    (filters.state === "active" && b.isActive) ||
    (filters.state === "inactive" && !b.isActive) ||
    (filters.state === "empty" && !b.studentCount);

  const byStandard = (standards.data ?? [])
    .filter((s) => !filters.standardId || s.id === filters.standardId)
    .map((s) => ({
      standard: s,
      batches: (batches.data ?? []).filter(
        (b) =>
          b.standardId === s.id &&
          matchesState(b) &&
          (!needle || `${b.name} ${s.name} ${b.room ?? ""}`.toLowerCase().includes(needle)),
      ),
    }))
    .filter((g) => g.batches.length);
  const standardsWithBatches = (standards.data ?? []).filter((s) => (batches.data ?? []).some((b) => b.standardId === s.id));

  return (
    <Screen
      title="Batches"
      subtitle={year ? `Academic year ${year.label}` : undefined}
      right={canManage && !creating ? <Button label="New batch" onPress={() => setCreating(true)} testID="batch-new" /> : undefined}
      testID="batches-screen"
    >
      <VStack gap={16}>
        {!year && !batches.isLoading ? <Banner tone="warning" message="Set the current academic year in Settings first." /> : null}
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {creating ? <BatchForm onDone={() => setCreating(false)} /> : null}
        <HStack gap={12} align="center" wrap>
          <SearchInput
            value={filters.search}
            onChangeText={(v) => set({ search: v })}
            placeholder="Batch name or room"
            style={{ flex: 2, minWidth: 220 }}
            testID="batches-search"
          />
          <HStack style={{ flex: 1, minWidth: 180 }}>
            <Select
              value={filters.standardId || null}
              options={[{ value: "", label: "All standards" }, ...standardsWithBatches.map((s) => ({ value: s.id, label: s.name }))]}
              onChange={(v) => set({ standardId: v })}
              placeholder="All standards"
            />
          </HStack>
        </HStack>
        <HStack gap={12} align="center" wrap>
          <ChipsRow
            chips={[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
              { key: "empty", label: "No students" },
            ]}
            active={filters.state}
            onChange={(k) => set({ state: k })}
          />
          {isFiltered ? <Button label="Clear filters" variant="ghost" size="sm" onPress={reset} /> : null}
        </HStack>
        {batches.data && batches.data.length > 0 && byStandard.length === 0 ? (
          <EmptyState icon={Users} title="No batch matches these filters" />
        ) : null}
        {batches.isLoading ? <Skeleton height={120} /> : null}
        {batches.error ? <ErrorState error={batches.error} onRetry={() => void batches.refetch()} /> : null}
        {batches.data && batches.data.length === 0 ? <EmptyState icon={Users} title="No batches this year yet" /> : null}
        {byStandard.map(({ standard, batches: list }) => (
          <VStack key={standard.id} gap={8}>
            <Text variant="overline" tone="tertiary">
              {standard.name}
            </Text>
            {list.map((b) => (
              // not pressable itself: its View/Edit/Delete buttons would sit inside another button
              <Card key={b.id} testID={`batch-${b.name}`}>
                <HStack gap={12} align="center" wrap>
                  <VStack gap={2} flex={1} style={{ minWidth: 180 }}>
                    <Text variant="h3">{b.name}</Text>
                    <Text variant="body-sm" tone="secondary">
                      {to12h(b.startTime)} – {to12h(b.endTime)} · {dayLabels(b.workingDays)}
                      {b.room ? ` · ${b.room}` : ""}
                    </Text>
                  </VStack>
                  {!b.isActive ? <StatusChip status="inactive" size="sm" /> : null}
                  <Text variant="metric-sm">{b.studentCount ?? 0}</Text>
                  <Text variant="caption" tone="tertiary">
                    students
                  </Text>
                  <HStack gap={4} align="center">
                    <Button
                      label="View"
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      icon={<Eye size={16} color={palette.primary[700]} />}
                      onPress={() => navigation.navigate("BatchDetail", { id: b.id })}
                      accessibilityHint={`Shows ${b.name} and its students`}
                      testID={`batch-view-${b.name}`}
                    />
                    {canManage || canAssign ? (
                      <Button
                        label="Edit"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        icon={<Pencil size={16} color={palette.text.secondary} />}
                        onPress={() => navigation.navigate("BatchEdit", { id: b.id })}
                        accessibilityHint={`Edits ${b.name} and who is in it`}
                        testID={`batch-edit-${b.name}`}
                      />
                    ) : null}
                    {canManage ? (
                      <Button
                        label="Delete"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        icon={<Trash2 size={16} color={palette.danger.text} />}
                        onPress={() => setDeleting(b)}
                        accessibilityHint={`Asks before deleting ${b.name}`}
                        testID={`batch-delete-${b.name}`}
                      />
                    ) : null}
                  </HStack>
                </HStack>
              </Card>
            ))}
          </VStack>
        ))}
      </VStack>

      {deleting ? (
        <ConfirmDialog
          visible
          title={`Delete ${deleting.name}?`}
          message={
            deleting.studentCount
              ? `${deleting.studentCount} student(s) are in this batch. A batch that was ever used cannot be deleted — its attendance history needs it. Move the students, then set it inactive under Edit instead.`
              : "Only a batch that was never used can be deleted. If it has any history, it will be kept and you will be told to set it inactive instead."
          }
          confirmLabel="Delete batch"
          destructive
          loading={remove.isPending}
          onConfirm={async () => {
            setMsg(null);
            try {
              await remove.mutateAsync(deleting.id);
              setMsg({ tone: "success", text: `${deleting.name} deleted.` });
            } catch (err) {
              setMsg({ tone: "danger", text: apiErrorMessage(err) });
            }
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </Screen>
  );
}
