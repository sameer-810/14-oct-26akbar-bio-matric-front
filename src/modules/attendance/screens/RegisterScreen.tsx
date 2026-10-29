import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import {
  Screen,
  VStack,
  HStack,
  Card,
  Text,
  Button,
  Select,
  StatusChip,
  Banner,
  TextField,
  Skeleton,
  ErrorState,
  SectionHeader,
  SearchInput,
  ChipsRow,
  useBreakpoint,
} from "@shared/ui";
import { useFilters } from "@shared/useFilters";
import { palette, radius } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay, formatTime } from "@shared/format";
import { useBatches, useCurrentYear } from "@modules/academy/hooks/useAcademy";
import { useRegister, useAttendanceActions } from "../hooks/useAttendance";
import { CountsRow } from "../components/CountsRow";
import { CorrectionPanel } from "../components/CorrectionPanel";
import type { RegistersParamList } from "../RegistersNavigator";

type Props = NativeStackScreenProps<RegistersParamList, "Register">;

const shift = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  return new Date(d.getTime() + n * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);
};
const hm = (mins: number | null) => (mins === null ? "—" : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`);

/** One batch, one day: who came, when, for how long — and the day's lectures. */
export default function RegisterScreen({ route, navigation }: Props) {
  const { isWide } = useBreakpoint();
  const year = useCurrentYear();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const canCorrect = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE));
  const canSchedule = useAuthStore((s) => s.hasPermission(PERMISSIONS.LECTURES_MANAGE));
  const [batchId, setBatchId] = useState<string | null>(route.params?.batchId ?? null);
  const [date, setDate] = useState(route.params?.date ?? academyToday());
  const [open, setOpen] = useState<string | null>(null);
  const [lecture, setLecture] = useState<{ startTime: string; endTime: string; subject: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // until someone picks one, the first batch is shown
  const activeBatch = batchId ?? batches.data?.[0]?.id ?? null;
  const reg = useRegister(activeBatch, date);
  const act = useAttendanceActions();
  const { filters, set, reset, isFiltered } = useFilters("register", { search: "", status: "all" });
  const needle = filters.search.trim().toLowerCase();
  const rows = (reg.data?.rows ?? []).filter(
    (r) =>
      (!needle || `${r.name} ${r.grNumber}`.toLowerCase().includes(needle)) &&
      (filters.status === "all" ||
        (filters.status === "notyet" ? !r.status : filters.status === "manual" ? r.source === "manual" : r.status === filters.status)),
  );

  return (
    <Screen title="Registers" subtitle={formatDay(date)} testID="register-screen">
      <VStack gap={14}>
        <HStack gap={12} align="center" wrap>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Select
              value={activeBatch}
              options={(batches.data ?? []).map((b) => ({ value: b.id, label: b.name, sublabel: `${b.startTime}–${b.endTime}` }))}
              onChange={(v) => {
                setBatchId(v);
                setOpen(null);
              }}
              placeholder="Choose a batch"
            />
          </View>
          <HStack gap={4} align="center">
            <Pressable onPress={() => setDate(shift(date, -1))} accessibilityRole="button" accessibilityLabel="Previous day" style={styles.dayBtn}>
              <ChevronLeft size={18} color={palette.text.secondary} />
            </Pressable>
            <TextField value={date} onChangeText={(t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && setDate(t)} accessibilityLabel="Date" containerStyle={{ width: 140 }} />
            <Pressable
              onPress={() => date < academyToday() && setDate(shift(date, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              style={styles.dayBtn}
            >
              <ChevronRight size={18} color={date < academyToday() ? palette.text.secondary : palette.text.disabled} />
            </Pressable>
          </HStack>
        </HStack>

        {msg ? <Banner tone="info" message={msg} onDismiss={() => setMsg(null)} /> : null}
        {reg.isLoading ? <Skeleton height={200} /> : null}
        {reg.error ? <ErrorState error={reg.error} onRetry={() => void reg.refetch()} /> : null}

        {reg.data ? (
          <>
            {reg.data.holiday ? <Banner tone="info" message="A holiday for this batch. Nobody is marked absent." /> : null}
            <CountsRow counts={reg.data.counts} notYet={reg.data.rows.filter((r) => !r.status).length} />

            <Card>
              <VStack gap={8}>
                <SectionHeader
                  title="Lectures"
                  subtitle="Marked from punches automatically; open one to correct it."
                  right={canSchedule && !lecture ? <Button label="Add lecture" size="xs" variant="secondary" onPress={() => setLecture({ startTime: "", endTime: "", subject: "" })} /> : undefined}
                />
                <HStack gap={8} wrap>
                  {reg.data.lectures.map((l) => (
                    <Button
                      key={l.id}
                      label={`${l.startTime}–${l.endTime} ${l.subject || "Lecture"}${l.status === "cancelled" ? " (cancelled)" : ""}`}
                      size="sm"
                      variant="secondary"
                      onPress={() => navigation.navigate("LectureRegister", { id: l.id })}
                      testID={`lecture-${l.startTime}`}
                    />
                  ))}
                  {reg.data.lectures.length === 0 ? <Text tone="tertiary">No lectures on this day.</Text> : null}
                </HStack>
                {lecture ? (
                  <HStack gap={8} wrap align="flex-end">
                    <TextField label="Starts" value={lecture.startTime} onChangeText={(t) => setLecture({ ...lecture, startTime: t })} placeholder="15:30" containerStyle={{ width: 110 }} />
                    <TextField label="Ends" value={lecture.endTime} onChangeText={(t) => setLecture({ ...lecture, endTime: t })} placeholder="16:30" containerStyle={{ width: 110 }} />
                    <TextField label="Subject" value={lecture.subject} onChangeText={(t) => setLecture({ ...lecture, subject: t })} containerStyle={{ flex: 1, minWidth: 140 }} />
                    <Button
                      label="Add"
                      onPress={async () => {
                        try {
                          await act.createLecture.mutateAsync({ batchId: activeBatch as string, date, ...lecture });
                          setLecture(null);
                        } catch (err) {
                          setMsg(apiErrorMessage(err));
                        }
                      }}
                    />
                    <Button label="Cancel" variant="ghost" onPress={() => setLecture(null)} />
                  </HStack>
                ) : null}
              </VStack>
            </Card>

            <HStack gap={12} align="center" wrap>
              <SearchInput
                value={filters.search}
                onChangeText={(v) => set({ search: v })}
                placeholder="Student name or GR"
                style={{ flex: 1, minWidth: 200 }}
                testID="register-search"
              />
              <ChipsRow
                chips={[
                  { key: "all", label: "Everyone" },
                  { key: "present", label: "Present" },
                  { key: "late", label: "Late" },
                  { key: "absent", label: "Absent" },
                  { key: "leave", label: "On leave" },
                  { key: "notyet", label: "Not yet" },
                  { key: "manual", label: "Set by hand" },
                ]}
                active={filters.status}
                onChange={(k) => set({ status: k })}
              />
              {isFiltered ? <Button label="Clear filters" variant="ghost" size="sm" onPress={reset} /> : null}
            </HStack>

            <Card>
              <VStack gap={0}>
                {isWide ? (
                  <HStack gap={8} style={styles.headRow}>
                    <Text variant="label" tone="tertiary" style={{ width: 70 }}>GR</Text>
                    <Text variant="label" tone="tertiary" style={{ flex: 2 }}>Student</Text>
                    <Text variant="label" tone="tertiary" style={{ width: 90 }}>Status</Text>
                    <Text variant="label" tone="tertiary" style={{ width: 80 }}>In</Text>
                    <Text variant="label" tone="tertiary" style={{ width: 80 }}>Out</Text>
                    <Text variant="label" tone="tertiary" style={{ width: 90 }}>In class</Text>
                  </HStack>
                ) : null}
                {rows.map((r) => (
                  <View key={r.studentId}>
                    <Pressable
                      onPress={() => canCorrect && setOpen(open === r.studentId ? null : r.studentId)}
                      accessibilityRole={canCorrect ? "button" : undefined}
                      accessibilityLabel={`${r.name}, ${r.status ?? "not yet"}`}
                      style={({ pressed }) => [styles.row, pressed && canCorrect ? { backgroundColor: palette.ink[50] } : null]}
                      testID={`register-row-${r.grNumber}`}
                    >
                      <HStack gap={8} align="center" wrap={!isWide}>
                        <Text variant="body-sm" tabular style={{ width: 70 }}>{r.grNumber}</Text>
                        <Text variant="body-sm" style={{ flex: 2, minWidth: 140 }}>
                          {r.name}
                          {r.source === "manual" ? <Text variant="caption" tone="warning">{`  set by hand — ${r.reason}`}</Text> : null}
                        </Text>
                        <View style={{ width: 90 }}>{r.status ? <StatusChip status={r.status} size="sm" /> : <Text variant="caption" tone="tertiary">not yet</Text>}</View>
                        <Text variant="body-sm" tabular style={{ width: 80 }}>{formatTime(r.entryAt)}</Text>
                        <Text variant="body-sm" tabular style={{ width: 80 }}>{formatTime(r.exitAt)}</Text>
                        <Text variant="body-sm" tabular style={{ width: 90 }}>{hm(r.durationMinutes)}</Text>
                      </HStack>
                    </Pressable>
                    {open === r.studentId ? <CorrectionPanel row={r} date={date} onDone={() => setOpen(null)} /> : null}
                  </View>
                ))}
                {reg.data.rows.length === 0 ? <Text tone="tertiary">Nobody in this batch on this day.</Text> : null}
                {reg.data.rows.length > 0 && rows.length === 0 ? <Text tone="tertiary">Nobody matches these filters.</Text> : null}
              </VStack>
            </Card>
          </>
        ) : null}
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  headRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border.default },
  row: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: palette.border.subtle, borderRadius: radius.sm },
});
