import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, TextField, Select } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { formatDay } from "@shared/format";
import { useBatches } from "@modules/academy/hooks/useAcademy";
import { useTeachers } from "@modules/teachers/hooks/useTeachers";
import { useLectureActions } from "../hooks/useLectures";
import type { Lecture } from "../types";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Add one lecture (the old "single schedule"), or change one. */
export function LectureForm({
  lecture,
  date,
  batchId,
  onDone,
}: {
  lecture?: Lecture;
  date?: string;
  batchId?: string;
  onDone: () => void;
}) {
  const act = useLectureActions();
  const batches = useBatches();
  const teachers = useTeachers({ active: true });
  const [v, setV] = useState({
    batchId: lecture?.batchId ?? batchId ?? "",
    date: lecture?.date ?? date ?? "",
    startTime: lecture?.startTime ?? "",
    endTime: lecture?.endTime ?? "",
    subject: lecture?.subject ?? "",
    teacherId: lecture?.teacherId ?? "",
    topics: lecture?.topics ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const pending = act.create.isPending || act.update.isPending;

  async function submit() {
    setError(null);
    if (!HHMM.test(v.startTime) || !HHMM.test(v.endTime)) {
      setError("Write times as HH:MM on the 24-hour clock, for example 16:30.");
      return;
    }
    try {
      if (lecture) {
        await act.update.mutateAsync({
          id: lecture.id,
          patch: { startTime: v.startTime, endTime: v.endTime, subject: v.subject, teacherId: v.teacherId || null, topics: v.topics },
        });
      } else {
        await act.create.mutateAsync({
          batchId: v.batchId,
          date: v.date,
          startTime: v.startTime,
          endTime: v.endTime,
          subject: v.subject || undefined,
          teacherId: v.teacherId || undefined,
          topics: v.topics || undefined,
        });
      }
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID="lecture-form">
      <VStack gap={12}>
        <SectionHeader title={lecture ? `Change ${lecture.subject || "lecture"} · ${formatDay(lecture.date)}` : "Add a lecture"} />
        {error ? <Banner tone="danger" message={error} /> : null}
        {!lecture ? (
          <HStack gap={12} wrap>
            <VStack flex={1} style={{ minWidth: 200 }}>
              <Select
                label="Batch"
                value={v.batchId || null}
                options={(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))}
                onChange={(id) => setV({ ...v, batchId: id })}
                placeholder="Choose a batch"
              />
            </VStack>
            <TextField label="Date" value={v.date} onChangeText={(t) => setV({ ...v, date: t })} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="lecture-date" />
          </HStack>
        ) : null}
        <HStack gap={12} wrap>
          <TextField label="Starts" value={v.startTime} onChangeText={(t) => setV({ ...v, startTime: t })} placeholder="16:00" containerStyle={{ width: 110 }} testID="lecture-start" />
          <TextField label="Ends" value={v.endTime} onChangeText={(t) => setV({ ...v, endTime: t })} placeholder="17:00" containerStyle={{ width: 110 }} testID="lecture-end" />
          <TextField label="Subject" value={v.subject} onChangeText={(t) => setV({ ...v, subject: t })} containerStyle={{ flex: 1, minWidth: 140 }} testID="lecture-subject" />
        </HStack>
        <Select
          label="Teacher"
          value={v.teacherId || null}
          options={[{ value: "", label: "No teacher set" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: t.displayName, sublabel: t.subjects.join(", ") }))]}
          onChange={(id) => setV({ ...v, teacherId: id })}
          placeholder="Choose the teacher"
        />
        <TextField label="Topics" value={v.topics} onChangeText={(t) => setV({ ...v, topics: t })} placeholder="Optional" maxLength={300} />
        <HStack gap={8}>
          <Button
            label={lecture ? "Save" : "Add lecture"}
            onPress={submit}
            loading={pending}
            disabled={!lecture && (!v.batchId || !v.date)}
            testID="lecture-save"
          />
          <Button label="Cancel" variant="ghost" onPress={onDone} />
        </HStack>
      </VStack>
    </Card>
  );
}
