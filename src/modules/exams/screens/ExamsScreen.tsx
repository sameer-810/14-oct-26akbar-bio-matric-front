import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FileText } from "lucide-react-native";

import { Screen, VStack, HStack, Button, ChipsRow, Select, Skeleton, ErrorState, EmptyState, Banner } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday } from "@shared/format";
import { useBatches } from "@modules/academy/hooks/useAcademy";
import { useExamList } from "../hooks/useExams";
import { ExamCard } from "../components/ExamCard";
import { ExamForm } from "../components/ExamForm";
import type { ExamStatus } from "../types";
import type { ExamsParamList } from "../ExamsNavigator";

type Props = NativeStackScreenProps<ExamsParamList, "ExamsList">;
type StatusFilter = "all" | ExamStatus;

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Upcoming" },
  { key: "published", label: "Published" },
  { key: "cancelled", label: "Cancelled" },
];

/**
 * Every test, newest first (the old "Exams"). "Upcoming" is every test whose
 * results have not gone out yet, including ones already sat and waiting for
 * marks.
 */
export default function ExamsScreen({ navigation }: Props) {
  const canCreate = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXAMS_MARKS) || s.hasPermission(PERMISSIONS.EXAMS_PUBLISH));
  const [today] = useState(() => academyToday());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [batchId, setBatchId] = useState("");
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const batches = useBatches();
  const list = useExamList({ status: status === "all" ? undefined : status, batchId: batchId || undefined });
  const exams = list.data ?? [];

  return (
    <Screen
      title="Tests"
      subtitle="Marks, results and announcements to families"
      right={canCreate && !adding ? <Button label="New test" onPress={() => setAdding(true)} testID="exam-new" /> : undefined}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      testID="exams-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} wrap align="flex-end">
          <ChipsRow chips={STATUS_CHIPS} active={status} onChange={(k) => setStatus(k as StatusFilter)} />
          <VStack style={{ minWidth: 200, flex: 1 }}>
            <Select
              value={batchId || null}
              options={[{ value: "", label: "All batches" }, ...(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))]}
              onChange={setBatchId}
              placeholder="All batches"
            />
          </VStack>
        </HStack>

        {saved ? <Banner tone="success" message={saved} onDismiss={() => setSaved(null)} /> : null}
        {adding ? (
          <ExamForm
            onDone={(created) => {
              setAdding(false);
              if (created) setSaved(`${created.name} is set up. Open it to announce it or enter marks.`);
            }}
          />
        ) : null}

        {list.isLoading ? <Skeleton height={160} /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
        {list.data && exams.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={status === "all" && !batchId ? "No tests yet" : "No tests match"}
            message={canCreate && status === "all" && !batchId ? "Set one up with New test." : undefined}
          />
        ) : null}
        {exams.map((e) => (
          <ExamCard key={e.id} exam={e} today={today} onOpen={() => navigation.navigate("ExamSheet", { id: e.id })} />
        ))}
      </VStack>
    </Screen>
  );
}
