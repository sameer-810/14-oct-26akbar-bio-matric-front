import React, { useState } from "react";
import { Users } from "lucide-react-native";
import { Card, VStack, HStack, Text, Avatar, StatusChip, SearchInput, ChipsRow, DataTable, Pagination, ErrorState, Skeleton, type Column } from "@shared/ui";
import { formatDay } from "@shared/format";
import { useBatchStudents } from "../hooks/useAcademy";
import type { Batch, BatchStudent, BatchStudentQuery } from "../types";
import { to12h } from "./batchTime";

interface Props {
  batch: Batch;
  onOpenStudent?: (s: BatchStudent) => void;
  /** extra controls per row — the edit page's remove and move buttons */
  actions?: (s: BatchStudent) => React.ReactNode;
  testID?: string;
}

type Status = NonNullable<BatchStudentQuery["status"]>;

/**
 * Everyone in a batch now — home or extra batch — with what the old portal's
 * batch page showed, read from each student's own record.
 */
export function BatchStudentsTable({ batch, onOpenStudent, actions, testID }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [page, setPage] = useState(1);
  const list = useBatchStudents(batch.id, { search: search.trim() || undefined, status, page });
  const time = `${to12h(batch.startTime)} – ${to12h(batch.endTime)}`;

  const columns: Column<BatchStudent>[] = [
    {
      key: "student",
      header: "Student",
      flex: 2,
      render: (s) => (
        <HStack gap={10} align="center">
          <Avatar name={s.name} uri={s.photoUrl || undefined} size={40} />
          <VStack gap={1} flex={1}>
            <Text variant="label">{s.name}</Text>
            <HStack gap={6} align="center" wrap>
              <Text variant="caption" tone="tertiary" tabular>
                GR {s.grNumber}
              </Text>
              {s.membership === "extra" ? <StatusChip status="extra batch" size="sm" /> : null}
              {s.status !== "active" ? <StatusChip status={s.status} size="sm" /> : null}
            </HStack>
          </VStack>
        </HStack>
      ),
    },
    { key: "joined", header: "In batch since", width: 120, render: (s) => <Text variant="body-sm">{s.joinedOn ? formatDay(s.joinedOn) : "—"}</Text> },
    { key: "time", header: "Batch time", width: 150, render: () => <Text variant="body-sm">{time}</Text> },
    { key: "last", header: "Last day", width: 110, render: (s) => <Text variant="body-sm">{formatDay(s.validTill)}</Text> },
    { key: "school", header: "School", flex: 1, render: (s) => <Text variant="body-sm">{s.schoolName || "—"}</Text> },
    { key: "phone", header: "Mobile", width: 120, render: (s) => <Text variant="body-sm" selectable>{s.phone || "—"}</Text> },
    ...(actions ? [{ key: "actions", header: "", width: 190, align: "right" as const, render: actions }] : []),
  ];

  return (
    <VStack gap={12} testID={testID}>
      <HStack gap={12} align="center" wrap>
        <SearchInput
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Name, GR number or mobile"
          style={{ flex: 2, minWidth: 220 }}
          testID="batch-students-search"
        />
        <ChipsRow
          chips={[
            { key: "active", label: "Active" },
            { key: "expired", label: "Expired" },
            { key: "left", label: "Left" },
            { key: "all", label: "All" },
          ]}
          active={status}
          onChange={(k) => {
            setStatus(k as Status);
            setPage(1);
          }}
        />
      </HStack>
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.isLoading ? (
        <Skeleton height={200} />
      ) : (
        <DataTable
          columns={columns}
          rows={list.data?.data ?? []}
          keyExtractor={(s) => s.id}
          onRowPress={onOpenStudent}
          mobileCard={(s) => (
            // pressable only without row buttons: a button inside a button breaks on the web
            <Card onPress={!actions && onOpenStudent ? () => onOpenStudent(s) : undefined}>
              <VStack gap={8}>
                {columns[0].render(s)}
                <Text variant="body-sm" tone="secondary">
                  In batch since {s.joinedOn ? formatDay(s.joinedOn) : "—"} · Last day {formatDay(s.validTill)}
                </Text>
                <Text variant="body-sm" tone="secondary">
                  {time} · {s.schoolName || "No school on record"}
                </Text>
                <Text variant="body-sm" selectable>
                  {s.phone || "No mobile on record"}
                </Text>
                {actions ? actions(s) : null}
              </VStack>
            </Card>
          )}
          emptyIcon={Users}
          emptyTitle={search || status !== "active" ? "Nobody matches" : "No students in this batch yet"}
        />
      )}
      {list.data ? (
        <HStack justify="space-between" align="center" wrap gap={8}>
          <Text variant="caption" tone="tertiary">
            {list.data.meta.total} student{list.data.meta.total === 1 ? "" : "s"}
            {list.isFetching ? " · updating…" : ""}
          </Text>
          {list.data.meta.pages > 1 ? (
            <Pagination page={page} totalPages={list.data.meta.pages} total={list.data.meta.total} limit={50} onPageChange={setPage} />
          ) : null}
        </HStack>
      ) : null}
    </VStack>
  );
}
