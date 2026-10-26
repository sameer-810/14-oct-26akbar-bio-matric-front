import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
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
  type Column,
} from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useBatches, useCurrentYear } from "@modules/academy/hooks/useAcademy";
import { useStudents } from "../hooks/useStudents";
import type { StudentListItem, StudentStatus } from "../types";
import type { StudentsParamList } from "../StudentsNavigator";

export default function StudentsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<StudentsParamList>>();
  const canAdmit = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const year = useCurrentYear();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [batchId, setBatchId] = useState<string>("");
  const [page, setPage] = useState(1);
  const students = useStudents({ search: search.trim() || undefined, status, batchId: batchId || undefined, page });
  const batchName = (id: string | null) =>
    id ? (batches.data?.find((b) => b.id === id)?.name ?? "") : "Not in a batch";

  const columns: Column<StudentListItem>[] = [
    { key: "gr", header: "GR", width: 80, render: (s) => <Text variant="body-sm" tabular>{s.grNumber}</Text> },
    {
      key: "name",
      header: "Name",
      flex: 2,
      render: (s) => (
        <VStack gap={1}>
          <Text variant="label">{s.name}</Text>
          <Text variant="caption" tone="tertiary">
            {s.phone || "no phone"}
          </Text>
        </VStack>
      ),
    },
    { key: "batch", header: "Batch", flex: 1, render: (s) => <Text variant="body-sm">{batchName(s.batchId)}</Text> },
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
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Name, GR number or phone"
            style={{ flex: 2, minWidth: 220 }}
            testID="students-search"
          />
          <HStack style={{ flex: 1, minWidth: 200 }}>
            <Select
              value={batchId || null}
              options={[
                { value: "", label: "All batches" },
                { value: "none", label: "Not in a batch" },
                ...(batches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
              ]}
              onChange={(v) => {
                setBatchId(v);
                setPage(1);
              }}
              placeholder="All batches"
            />
          </HStack>
        </HStack>
        <ChipsRow
          chips={[
            { key: "active", label: "Active" },
            { key: "expired", label: "Expired" },
            { key: "left", label: "Left" },
          ]}
          active={status}
          onChange={(k) => {
            setStatus(k as StudentStatus);
            setPage(1);
          }}
        />
        {students.error ? <ErrorState error={students.error} onRetry={() => void students.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={students.data?.data ?? []}
          keyExtractor={(s) => s.id}
          onRowPress={(s) => nav.navigate("StudentDetail", { id: s.id })}
          emptyIcon={GraduationCap}
          emptyTitle={students.isLoading ? "Loading…" : search ? "Nobody matches" : "No students yet"}
          testID="students-table"
        />
        {students.data && students.data.meta.pages > 1 ? (
          <Pagination page={page} totalPages={students.data.meta.pages} total={students.data.meta.total} limit={50} onPageChange={setPage} />
        ) : null}
      </VStack>
    </Screen>
  );
}
