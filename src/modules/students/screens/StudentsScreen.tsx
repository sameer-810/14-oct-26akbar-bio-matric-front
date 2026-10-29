import React, { useEffect } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GraduationCap, Fingerprint } from "lucide-react-native";

import {
  Screen,
  VStack,
  HStack,
  Text,
  Button,
  DataTable,
  SearchInput,
  ChipsRow,
  Select,
  StatusChip,
  ErrorState,
  Pagination,
  Avatar,
  type Column,
} from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useFilters } from "@shared/useFilters";
import { useBatches, useStandards, useCurrentYear } from "@modules/academy/hooks/useAcademy";
import { useStudents } from "../hooks/useStudents";
import type { StudentListItem, StudentStatus } from "../types";
import type { StudentsParamList } from "../StudentsNavigator";

export default function StudentsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<StudentsParamList>>();
  const params = useRoute<RouteProp<StudentsParamList, "StudentsList">>().params;
  const canAdmit = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const year = useCurrentYear();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const standards = useStandards();
  const { filters, set, reset, isFiltered } = useFilters("students", {
    search: "",
    status: "active" as StudentStatus,
    standardId: "",
    batchId: "",
    fingerprint: "" as "" | "on" | "missing",
    page: 1,
  });
  const { search, status, standardId, batchId, fingerprint, page } = filters;
  // opened from a batch's card: show that batch's students
  useEffect(() => {
    if (params?.batchId) set({ search: "", status: "active", standardId: params.standardId ?? "", batchId: params.batchId, fingerprint: "", page: 1 });
  }, [params?.batchId, params?.standardId, set]);
  // every change of filter starts again at page 1
  const pick = (patch: Partial<typeof filters>) => set({ ...patch, page: 1 });
  const students = useStudents({
    search: search.trim() || undefined,
    status,
    standardId: standardId || undefined,
    batchId: batchId || undefined,
    fingerprint: fingerprint || undefined,
    page,
  });
  const batchOptions = (batches.data ?? []).filter((b) => !standardId || b.standardId === standardId);
  const batchName = (id: string | null) =>
    id ? (batches.data?.find((b) => b.id === id)?.name ?? "") : "Not in a batch";

  const columns: Column<StudentListItem>[] = [
    { key: "gr", header: "GR", width: 80, render: (s) => <Text variant="body-sm" tabular>{s.grNumber}</Text> },
    {
      key: "name",
      header: "Name",
      flex: 2,
      render: (s) => (
        <HStack gap={10} align="center">
          <Avatar name={s.name} uri={s.photoUrl || undefined} size={32} />
          <VStack gap={1}>
            <Text variant="label">{s.name}</Text>
            <Text variant="caption" tone="tertiary">
              {s.phone || "no phone"}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: "batch",
      header: "Batch",
      flex: 1,
      render: (s) => <Text variant="body-sm">{[batchName(s.batchId), ...s.extraBatchIds.map(batchName)].filter(Boolean).join(" + ")}</Text>,
    },
    {
      key: "finger",
      header: "Finger",
      width: 90,
      render: (s) => (
        <HStack gap={4} align="center">
          <Fingerprint size={16} color={s.fingerprintEnrolled ? palette.success.text : palette.warning.text} />
          <Text variant="caption" tone={s.fingerprintEnrolled ? "success" : "warning"}>
            {s.fingerprintEnrolled ? "on file" : "missing"}
          </Text>
        </HStack>
      ),
    },
    { key: "status", header: "Status", width: 100, render: (s) => <StatusChip status={s.status} size="sm" /> },
  ];

  return (
    <Screen
      title="Students"
      subtitle={students.data ? `${students.data.meta.total} ${status}` : undefined}
      right={canAdmit ? <Button label="New admission" onPress={() => nav.navigate("AdmitStudent")} testID="students-admit" /> : undefined}
      testID="students-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} align="center" wrap>
          <SearchInput
            value={search}
            onChangeText={(v) => pick({ search: v })}
            placeholder="Name, GR number or phone"
            style={{ flex: 2, minWidth: 220 }}
            testID="students-search"
          />
          <HStack style={{ flex: 1, minWidth: 170 }}>
            <Select
              value={standardId || null}
              options={[{ value: "", label: "All standards" }, ...(standards.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
              // a batch from another standard would match nobody
              onChange={(v) => pick({ standardId: v, batchId: batchId === "none" ? "none" : "" })}
              placeholder="All standards"
            />
          </HStack>
          <HStack style={{ flex: 1, minWidth: 170 }}>
            <Select
              value={batchId || null}
              options={[
                { value: "", label: "All batches" },
                { value: "none", label: "Not in a batch" },
                ...batchOptions.map((b) => ({ value: b.id, label: b.name })),
              ]}
              onChange={(v) => pick({ batchId: v })}
              placeholder="All batches"
            />
          </HStack>
          <HStack style={{ flex: 1, minWidth: 150 }}>
            <Select
              value={fingerprint || null}
              options={[
                { value: "", label: "Any finger" },
                { value: "on", label: "Finger on file" },
                { value: "missing", label: "Finger missing" },
              ]}
              onChange={(v) => pick({ fingerprint: v as "" | "on" | "missing" })}
              placeholder="Any finger"
            />
          </HStack>
        </HStack>
        <HStack gap={12} align="center" wrap>
          <ChipsRow
            chips={[
              { key: "active", label: "Active" },
              { key: "expired", label: "Expired" },
              { key: "left", label: "Left" },
            ]}
            active={status}
            onChange={(k) => pick({ status: k as StudentStatus })}
          />
          {isFiltered ? <Button label="Clear filters" variant="ghost" size="sm" onPress={reset} testID="students-clear" /> : null}
        </HStack>
        {students.error ? <ErrorState error={students.error} onRetry={() => void students.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={students.data?.data ?? []}
          keyExtractor={(s) => s.id}
          onRowPress={(s) => nav.navigate("StudentDetail", { id: s.id })}
          emptyIcon={GraduationCap}
          emptyTitle={students.isLoading ? "Loading…" : isFiltered ? "Nobody matches" : "No students yet"}
          testID="students-table"
        />
        {students.data && students.data.meta.pages > 1 ? (
          <Pagination page={page} totalPages={students.data.meta.pages} total={students.data.meta.total} limit={50} onPageChange={(p) => set({ page: p })} />
        ) : null}
      </VStack>
    </Screen>
  );
}
