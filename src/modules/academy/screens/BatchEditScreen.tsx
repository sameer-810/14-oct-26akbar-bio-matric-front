import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Card, VStack, HStack, Text, Button, Banner, SectionHeader, SearchInput, Select, Avatar, ConfirmDialog, Skeleton, ErrorState } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday } from "@shared/format";
import { apiErrorMessage } from "@api/apiClient";
import { studentsApi } from "@modules/students/api/studentsApi";
import { useStudents } from "@modules/students/hooks/useStudents";
import { useBatch, useBatches } from "../hooks/useAcademy";
import { BatchForm } from "../components/BatchForm";
import { BatchStudentsTable } from "../components/BatchStudentsTable";
import type { BatchStudent } from "../types";
import type { BatchesParamList } from "../BatchesNavigator";

type Props = NativeStackScreenProps<BatchesParamList, "BatchEdit">;

/** What the admin is about to do to one student; confirmed before it runs. */
type Pending =
  | { kind: "remove"; student: { id: string; name: string } }
  | { kind: "home"; student: { id: string; name: string } }
  | { kind: "extra"; student: { id: string; name: string } }
  | { kind: "move"; student: { id: string; name: string }; to: string };

/** Edit a batch's details, and who is in it. Every change applies from today. */
export default function BatchEditScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const batch = useBatch(id);
  const others = useBatches(batch.data ? { academicYearId: batch.data.academicYearId } : {}, { enabled: Boolean(batch.data) });
  const canEditBatch = useAuthStore((s) => s.hasPermission(PERMISSIONS.BATCHES_MANAGE));
  const canAssign = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [moveTo, setMoveTo] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const found = useStudents({ search: search.trim() || undefined, status: "active", page: 1 });

  const change = useMutation({
    mutationFn: async (p: Pending) => {
      const from = academyToday();
      if (p.kind === "remove") return studentsApi.removeExtraBatch(p.student.id, id, from);
      if (p.kind === "extra") return studentsApi.addExtraBatch(p.student.id, id, from);
      if (p.kind === "home") return studentsApi.changeBatch(p.student.id, id, from);
      return studentsApi.changeBatch(p.student.id, p.to, from);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["batches"] });
      void qc.invalidateQueries({ queryKey: ["students"] });
      void qc.invalidateQueries({ queryKey: ["student"] });
    },
  });

  if (batch.isLoading) return <Screen title="Edit batch"><Skeleton height={240} /></Screen>;
  const b = batch.data;
  if (batch.error || !b) return <Screen title="Edit batch"><ErrorState error={batch.error} onRetry={() => void batch.refetch()} /></Screen>;
  if (!canEditBatch && !canAssign) return <Screen title={b.name}><Banner tone="warning" message="You can view this batch but not change it." /></Screen>;

  const nameOf = (bid: string) => others.data?.find((x) => x.id === bid)?.name ?? "the other batch";
  const moveTargets = (others.data ?? []).filter((x) => x.id !== id && x.isActive);
  const candidates = (found.data?.data ?? []).filter((s) => s.batchId !== id && !s.extraBatchIds.includes(id)).slice(0, 8);

  const confirmText = (p: Pending) =>
    p.kind === "remove"
      ? { title: `Remove ${p.student.name} from ${b.name}?`, message: "From today. Earlier lecture registers keep them.", label: "Remove" }
      : p.kind === "extra"
        ? { title: `Add ${p.student.name} to ${b.name}?`, message: "As an extra batch, from today. Their daily IN/OUT stays with their home batch.", label: "Add" }
        : p.kind === "home"
          ? { title: `Make ${b.name} ${p.student.name}'s home batch?`, message: "From today their IN/OUT, late and absent follow this batch's timing. Past days keep the old timing.", label: "Move here" }
          : { title: `Move ${p.student.name} to ${nameOf(p.to)}?`, message: "From today. Past days keep this batch's timing.", label: "Move" };

  const rowActions = (s: BatchStudent) =>
    s.membership === "extra" ? (
      <Button label="Remove" variant="ghost" size="sm" fullWidth={false} onPress={() => setPending({ kind: "remove", student: s })} accessibilityHint={`Removes ${s.name} from this batch`} />
    ) : (
      <HStack gap={6} align="center">
        <HStack style={{ width: 120 }}>
          <Select
            value={moveTo[s.id] || null}
            options={moveTargets.map((x) => ({ value: x.id, label: x.name }))}
            onChange={(v) => setMoveTo({ ...moveTo, [s.id]: v })}
            placeholder="Move to…"
          />
        </HStack>
        <Button label="Move" variant="secondary" size="sm" fullWidth={false} disabled={!moveTo[s.id]} onPress={() => setPending({ kind: "move", student: s, to: moveTo[s.id] })} />
      </HStack>
    );

  return (
    <Screen title={`Edit ${b.name}`} testID="batch-edit">
      <VStack gap={16}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {canEditBatch ? <BatchForm batch={b} onDone={() => navigation.navigate("BatchDetail", { id })} /> : null}

        {canAssign ? (
          <>
            <Card>
              <VStack gap={10}>
                <SectionHeader title="Add students" />
                <Text variant="body-sm" tone="secondary">
                  An extra batch adds this batch&apos;s lectures, tests and notices. Making it the home batch moves the student here.
                </Text>
                <SearchInput value={search} onChangeText={setSearch} placeholder="Name, GR number or mobile" testID="batch-add-search" />
                {search.trim().length >= 2 ? (
                  found.isLoading ? (
                    <Skeleton height={80} />
                  ) : candidates.length ? (
                    candidates.map((s) => (
                      <HStack key={s.id} gap={10} align="center" wrap>
                        <Avatar name={s.name} uri={s.photoUrl || undefined} size={32} />
                        <VStack gap={1} flex={1}>
                          <Text variant="label">{s.name}</Text>
                          <Text variant="caption" tone="tertiary">
                            GR {s.grNumber} · now in {s.batchId ? nameOf(s.batchId) : "no batch"}
                          </Text>
                        </VStack>
                        {s.batchId ? (
                          <Button label="Add as extra" variant="secondary" size="sm" fullWidth={false} onPress={() => setPending({ kind: "extra", student: s })} />
                        ) : null}
                        <Button label="Make home batch" variant="ghost" size="sm" fullWidth={false} onPress={() => setPending({ kind: "home", student: s })} />
                      </HStack>
                    ))
                  ) : (
                    <Text variant="body-sm" tone="tertiary">
                      Nobody else matches — or they are in this batch already.
                    </Text>
                  )
                ) : (
                  <Text variant="caption" tone="tertiary">
                    Type at least 2 characters.
                  </Text>
                )}
              </VStack>
            </Card>
            <SectionHeader title="Students in this batch" />
            <BatchStudentsTable batch={b} actions={rowActions} testID="batch-edit-students" />
          </>
        ) : null}
      </VStack>

      {pending ? (
        <ConfirmDialog
          visible
          title={confirmText(pending).title}
          message={confirmText(pending).message}
          confirmLabel={confirmText(pending).label}
          destructive={pending.kind === "remove"}
          loading={change.isPending}
          onConfirm={async () => {
            setMsg(null);
            try {
              await change.mutateAsync(pending);
              setMsg({ tone: "success", text: `${confirmText(pending).label}: ${pending.student.name}. Applies from today.` });
              if (pending.kind === "move") setMoveTo({ ...moveTo, [pending.student.id]: "" });
            } catch (err) {
              setMsg({ tone: "danger", text: apiErrorMessage(err) });
            }
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </Screen>
  );
}
