import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Plus, Trash2 } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, Select } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, addDaysTo, formatDay, formatWallTime } from "@shared/format";
import { useBatches } from "@modules/academy/hooks/useAcademy";
import { useTeachers } from "@modules/teachers/hooks/useTeachers";
import { DaysPicker } from "@modules/academy/components/DaysPicker";
import { useLectureActions } from "../hooks/useLectures";
import type { PlanResult, PlanSlot, Weekday } from "../types";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const blank = (): PlanSlot & { key: number } => ({ key: Math.random(), weekdays: [], startTime: "", endTime: "", subject: "", teacherId: "" });

const REASONS: Record<PlanResult["skipped"][number]["reason"], string> = {
  holiday: "holiday",
  "already scheduled": "already there",
  "teacher busy": "teacher busy",
};

/**
 * The old "weekly schedule": a batch's week, repeated between two dates.
 * One day with several rows is the old "quick schedule". Holidays, lectures
 * already there and a teacher already busy are skipped and listed.
 */
export default function PlanLecturesScreen() {
  const nav = useNavigation<{ goBack: () => void }>();
  const act = useLectureActions();
  const batches = useBatches();
  const teachers = useTeachers({ active: true });
  const [batchId, setBatchId] = useState("");
  const [from, setFrom] = useState(addDaysTo(academyToday(), 1));
  const [to, setTo] = useState(addDaysTo(academyToday(), 28));
  const [slots, setSlots] = useState([blank()]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);

  const setSlot = (key: number, patch: Partial<PlanSlot>) => setSlots(slots.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  async function submit() {
    setError(null);
    setResult(null);
    if (!ISO.test(from) || !ISO.test(to)) return setError("Write dates as YYYY-MM-DD.");
    const bad = slots.find((s) => !s.weekdays.length || !HHMM.test(s.startTime) || !HHMM.test(s.endTime));
    if (bad) return setError("Each row needs at least one day, and times as HH:MM (24-hour), for example 16:30.");
    try {
      const r = await act.plan.mutateAsync({
        batchId,
        from,
        to,
        slots: slots.map(({ weekdays, startTime, endTime, subject, teacherId }) => ({
          weekdays,
          startTime,
          endTime,
          subject: subject || undefined,
          teacherId: teacherId || undefined,
        })),
      });
      setResult(r);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Screen title="Plan timetable" subtitle="The same week, repeated between two dates" testID="plan-screen">
      <VStack gap={16}>
        <Card>
          <VStack gap={12}>
            <Select
              label="Batch"
              value={batchId || null}
              options={(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))}
              onChange={setBatchId}
              placeholder="Choose a batch"
            />
            <HStack gap={12} wrap>
              <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 140 }} testID="plan-from" />
              <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 140 }} testID="plan-to" />
            </HStack>
          </VStack>
        </Card>

        {slots.map((s, i) => (
          <Card key={s.key} testID={`plan-slot-${i}`}>
            <VStack gap={10}>
              <SectionHeader
                title={`Lecture ${i + 1}`}
                right={
                  slots.length > 1 ? (
                    <Button label="Remove" size="xs" variant="ghost" icon={<Trash2 size={14} color={palette.text.secondary} />} onPress={() => setSlots(slots.filter((x) => x.key !== s.key))} />
                  ) : undefined
                }
              />
              <DaysPicker value={s.weekdays} onChange={(d) => setSlot(s.key, { weekdays: d as Weekday[] })} />
              <HStack gap={12} wrap>
                <TextField label="Starts" value={s.startTime} onChangeText={(t) => setSlot(s.key, { startTime: t })} placeholder="16:00" containerStyle={{ width: 110 }} testID={`plan-start-${i}`} />
                <TextField label="Ends" value={s.endTime} onChangeText={(t) => setSlot(s.key, { endTime: t })} placeholder="17:00" containerStyle={{ width: 110 }} testID={`plan-end-${i}`} />
                <TextField label="Subject" value={s.subject} onChangeText={(t) => setSlot(s.key, { subject: t })} containerStyle={{ flex: 1, minWidth: 140 }} testID={`plan-subject-${i}`} />
              </HStack>
              <Select
                label="Teacher"
                value={s.teacherId || null}
                options={[{ value: "", label: "No teacher set" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: t.displayName, sublabel: t.subjects.join(", ") }))]}
                onChange={(id) => setSlot(s.key, { teacherId: id })}
                placeholder="Choose the teacher"
              />
            </VStack>
          </Card>
        ))}

        <HStack gap={8} wrap>
          <Button label="Another lecture" variant="secondary" icon={<Plus size={16} color={palette.text.primary} />} onPress={() => setSlots([...slots, blank()])} />
          <Button label="Create the lectures" onPress={submit} loading={act.plan.isPending} disabled={!batchId} testID="plan-submit" />
          <Button label="Back" variant="ghost" onPress={() => nav.goBack()} />
        </HStack>

        {error ? <Banner tone="danger" message={error} /> : null}
        {result ? (
          <Card testID="plan-result">
            <VStack gap={8}>
              <Text variant="h3">
                {result.created.length} lecture{result.created.length === 1 ? "" : "s"} created
                {result.skipped.length ? `, ${result.skipped.length} skipped` : ""}
              </Text>
              {result.skipped.slice(0, 30).map((k) => (
                <Text key={`${k.date}-${k.startTime}`} variant="body-sm" tone="secondary">
                  {formatDay(k.date)} {formatWallTime(k.startTime)} — {REASONS[k.reason]}
                </Text>
              ))}
              {result.skipped.length > 30 ? <Text variant="caption" tone="tertiary">…and {result.skipped.length - 30} more</Text> : null}
            </VStack>
          </Card>
        ) : null}
      </VStack>
    </Screen>
  );
}
