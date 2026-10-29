import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Fingerprint, UsersRound } from "lucide-react-native";
import {
  Screen,
  VStack,
  HStack,
  Card,
  Text,
  Button,
  Banner,
  TextField,
  Select,
  SearchInput,
  StatusChip,
  ToggleRow,
  EmptyState,
  ErrorState,
  SectionHeader,
  ChipsRow,
} from "@shared/ui";
import { useFilters } from "@shared/useFilters";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { useTeachers, useSaveTeacher } from "../hooks/useTeachers";
import { useBatches, useCurrentYear } from "@modules/academy/hooks/useAcademy";
import type { Teacher } from "../types";

/**
 * Faculty, with the fingerprint number each one already has on the machine.
 * The old system has 99 of 128 lectures this month under "Lecturer Sir/Madam";
 * a real name on every lecture starts here.
 */
export default function TeachersScreen() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.TEACHERS_MANAGE));
  const { filters, set, reset, isFiltered } = useFilters("teachers", { search: "", state: "active", subject: "", batchId: "" });
  const teachers = useTeachers({ search: filters.search.trim() || undefined });
  const year = useCurrentYear();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const subjects = [...new Set((teachers.data ?? []).flatMap((t) => t.subjects))].sort();
  const shown = (teachers.data ?? []).filter(
    (t) =>
      (filters.state === "all" || t.isActive === (filters.state === "active")) &&
      (!filters.subject || t.subjects.includes(filters.subject)) &&
      (!filters.batchId || t.batchIds.includes(filters.batchId)),
  );
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();

  return (
    <Screen
      title="Faculty"
      subtitle={teachers.data ? `${teachers.data.filter((t) => t.isActive).length} active` : undefined}
      right={canManage && editing !== "new" ? <Button label="Add faculty" onPress={() => setEditing("new")} testID="teacher-new" /> : undefined}
      testID="teachers-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} align="center" wrap>
          <SearchInput
            value={filters.search}
            onChangeText={(v) => set({ search: v })}
            placeholder="Name, phone or fingerprint ID"
            style={{ flex: 2, minWidth: 220 }}
          />
          <HStack style={{ flex: 1, minWidth: 160 }}>
            <Select
              value={filters.subject || null}
              options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => set({ subject: v })}
              placeholder="All subjects"
            />
          </HStack>
          <HStack style={{ flex: 1, minWidth: 160 }}>
            <Select
              value={filters.batchId || null}
              options={[{ value: "", label: "All batches" }, ...(batches.data ?? []).map((b) => ({ value: b.id, label: b.name }))]}
              onChange={(v) => set({ batchId: v })}
              placeholder="All batches"
            />
          </HStack>
        </HStack>
        <HStack gap={12} align="center" wrap>
          <ChipsRow
            chips={[
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
              { key: "all", label: "All" },
            ]}
            active={filters.state}
            onChange={(k) => set({ state: k })}
          />
          {isFiltered ? <Button label="Clear filters" variant="ghost" size="sm" onPress={reset} /> : null}
        </HStack>
        {editing === "new" ? <TeacherForm onDone={() => setEditing(null)} /> : null}
        {teachers.error ? <ErrorState error={teachers.error} onRetry={() => void teachers.refetch()} /> : null}
        {teachers.data?.length === 0 ? <EmptyState icon={UsersRound} title="No faculty yet" /> : null}
        {(teachers.data?.length ?? 0) > 0 && shown.length === 0 ? <EmptyState icon={UsersRound} title="Nobody matches these filters" /> : null}
        {shown.map((t) =>
          editing === t.id ? (
            <TeacherForm key={t.id} teacher={t} onDone={() => setEditing(null)} />
          ) : (
            <Card key={t.id} onPress={() => nav.navigate("TeacherDetail", { id: t.id })} testID={`teacher-${t.biometricId}`}>
              <HStack gap={12} align="center" wrap>
                <VStack gap={2} flex={1}>
                  <Text variant="h3">{t.displayName}</Text>
                  <Text variant="body-sm" tone="secondary">
                    Fingerprint ID {t.biometricId}
                    {t.phone ? ` · ${t.phone}` : ""}
                    {t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}
                  </Text>
                </VStack>
                <Fingerprint size={18} color={t.fingerprintEnrolled ? palette.success.text : palette.warning.text} />
                {!t.isActive ? <StatusChip status="inactive" size="sm" /> : null}
                {canManage ? <Button label="Edit" size="xs" variant="ghost" onPress={() => setEditing(t.id)} /> : null}
              </HStack>
            </Card>
          ),
        )}
      </VStack>
    </Screen>
  );
}

function TeacherForm({ teacher, onDone }: { teacher?: Teacher; onDone: () => void }) {
  const save = useSaveTeacher();
  const [v, setV] = useState({
    title: teacher?.title ?? "Mr.",
    name: teacher?.name ?? "",
    phone: teacher?.phone ?? "",
    subjects: (teacher?.subjects ?? []).join(", "),
    biometricId: "",
    isActive: teacher?.isActive ?? true,
    batchIds: teacher?.batchIds ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const year = useCurrentYear();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const toggleBatch = (id: string) =>
    setV((cur) => ({
      ...cur,
      batchIds: cur.batchIds.includes(id) ? cur.batchIds.filter((b) => b !== id) : [...cur.batchIds, id],
    }));

  async function submit() {
    setError(null);
    try {
      await save.mutateAsync({
        id: teacher?.id,
        title: v.title,
        name: v.name,
        phone: v.phone,
        subjects: v.subjects.split(",").map((s) => s.trim()).filter(Boolean),
        batchIds: v.batchIds,
        ...(teacher ? { isActive: v.isActive } : v.biometricId ? { biometricId: v.biometricId } : {}),
      });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title={teacher ? `Edit ${teacher.displayName}` : "Add faculty"} />
        {error ? <Banner tone="danger" message={error} /> : null}
        <HStack gap={12} wrap>
          <HStack style={{ width: 120 }}>
            <Select
              label="Title"
              value={v.title}
              options={["Mr.", "Ms.", "Mrs.", "Dr."].map((x) => ({ value: x, label: x }))}
              onChange={(t) => setV({ ...v, title: t })}
            />
          </HStack>
          <TextField label="Name" value={v.name} onChangeText={(t) => setV({ ...v, name: t })} containerStyle={{ flex: 1, minWidth: 200 }} testID="teacher-name" />
        </HStack>
        <HStack gap={12} wrap>
          <TextField label="Mobile" value={v.phone} onChangeText={(t) => setV({ ...v, phone: t })} keyboardType="phone-pad" containerStyle={{ flex: 1, minWidth: 180 }} />
          <TextField label="Subjects" value={v.subjects} onChangeText={(t) => setV({ ...v, subjects: t })} placeholder="Maths, Physics" containerStyle={{ flex: 2, minWidth: 200 }} />
        </HStack>
        {(batches.data ?? []).filter((b) => b.isActive).length ? (
          <VStack gap={6}>
            <Text variant="label">Batches they take</Text>
            <HStack gap={6} wrap>
              {(batches.data ?? [])
                .filter((b) => b.isActive)
                .map((b) => (
                  <Button
                    key={b.id}
                    label={b.name}
                    size="xs"
                    variant={v.batchIds.includes(b.id) ? "primary" : "secondary"}
                    onPress={() => toggleBatch(b.id)}
                    accessibilityHint={v.batchIds.includes(b.id) ? "Assigned. Press to remove." : "Press to assign."}
                    testID={`teacher-batch-${b.name}`}
                  />
                ))}
            </HStack>
          </VStack>
        ) : null}
        {!teacher ? (
          <TextField
            label="Fingerprint ID already on the machine"
            value={v.biometricId}
            onChangeText={(t) => setV({ ...v, biometricId: t.replace(/\D/g, "") })}
            keyboardType="number-pad"
            hint="Leave empty for a new teacher — the next free number is used."
            testID="teacher-bio"
          />
        ) : (
          <ToggleRow label="Active" value={v.isActive} onChange={(b) => setV({ ...v, isActive: b })} />
        )}
        <HStack gap={8}>
          <Button label="Save" onPress={submit} loading={save.isPending} testID="teacher-save" />
          <Button label="Cancel" variant="ghost" onPress={onDone} />
        </HStack>
      </VStack>
    </Card>
  );
}
