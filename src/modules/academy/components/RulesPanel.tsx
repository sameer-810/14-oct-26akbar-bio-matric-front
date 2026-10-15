import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, ToggleRow, TextField } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useUpdateSettings } from "../hooks/useAcademy";
import type { InstituteSettings } from "../types";
import { NumberField } from "./NumberField";

type Draft = Pick<
  InstituteSettings,
  | "name"
  | "branchName"
  | "address"
  | "phone"
  | "email"
  | "lateGraceMinutes"
  | "defaultEarlyWindowMinutes"
  | "exitGraceMinutes"
  | "doubleTapMinutes"
  | "backdateDays"
  | "lectureAutoMark"
  | "lectureReminders"
  | "facultyApp"
>;

/**
 * The academy's profile and the rules every register is built from. The four
 * lecture numbers are the old system's own (its "Biometric Setting" page),
 * which was switched off there; here it is on by default.
 */
export function RulesPanel({ settings }: { settings: InstituteSettings }) {
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const v: Draft = draft ?? settings;
  const set = (patch: Partial<Draft>) => setDraft({ ...v, ...patch });
  const setLecture = (patch: Partial<Draft["lectureAutoMark"]>) => set({ lectureAutoMark: { ...v.lectureAutoMark, ...patch } });

  async function submit() {
    setMsg(null);
    try {
      await save.mutateAsync(v);
      setDraft(null);
      setMsg({ tone: "success", text: "Saved. Registers use the new rules from now on." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <VStack gap={16}>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      <Card>
        <VStack gap={12}>
          <SectionHeader title="Academy" />
          <TextField label="Name" value={v.name} onChangeText={(t) => set({ name: t })} />
          <TextField label="Branch" value={v.branchName} onChangeText={(t) => set({ branchName: t })} />
          <TextField label="Address" value={v.address} onChangeText={(t) => set({ address: t })} />
          <HStack gap={12} wrap>
            <TextField label="Phone" value={v.phone} onChangeText={(t) => set({ phone: t })} keyboardType="phone-pad" containerStyle={{ flex: 1, minWidth: 200 }} />
            <TextField label="Email" value={v.email} onChangeText={(t) => set({ email: t })} autoCapitalize="none" containerStyle={{ flex: 1, minWidth: 200 }} />
          </HStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="Arrival and leaving" subtitle="How a punch becomes present, late or absent for a batch." />
          <NumberField label="Late after the start by more than" value={v.lateGraceMinutes} onChange={(n) => set({ lateGraceMinutes: n })} max={180} />
          <NumberField
            label="A punch counts from this long before the start"
            value={v.defaultEarlyWindowMinutes}
            onChange={(n) => set({ defaultEarlyWindowMinutes: n })}
            hint="Each batch can override this."
            max={240}
          />
          <NumberField label="Leaving counts until this long after the end" value={v.exitGraceMinutes} onChange={(n) => set({ exitGraceMinutes: n })} max={240} />
          <NumberField
            label="Two punches closer than this are one"
            value={v.doubleTapMinutes}
            onChange={(n) => set({ doubleTapMinutes: Math.max(1, n) })}
            hint="Students often press twice."
            max={60}
          />
          <NumberField
            label="Staff may correct attendance this many days back"
            value={v.backdateDays}
            onChange={(n) => set({ backdateDays: n })}
            suffix="days"
            max={60}
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="Lecture attendance from punches" subtitle="Marks each lecture present or absent automatically; staff only fix exceptions." />
          <ToggleRow label="Mark lectures automatically" value={v.lectureAutoMark.enabled} onChange={(b) => setLecture({ enabled: b })} />
          <NumberField label="A punch counts from this long before the lecture" value={v.lectureAutoMark.graceBeforeMinutes} onChange={(n) => setLecture({ graceBeforeMinutes: n })} max={240} />
          <NumberField label="…and until this long after it starts" value={v.lectureAutoMark.graceAfterMinutes} onChange={(n) => setLecture({ graceAfterMinutes: n })} max={240} />
          <NumberField label="Gap between lectures for a fresh punch" value={v.lectureAutoMark.repunchGapMinutes} onChange={(n) => setLecture({ repunchGapMinutes: n })} max={240} />
          <NumberField label="Mark the lecture this long after it starts" value={v.lectureAutoMark.markAfterMinutes} onChange={(n) => setLecture({ markAfterMinutes: n })} max={600} />
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="Lecture reminders and the faculty login" />
          <ToggleRow
            label="Remind families before each lecture"
            hint="A push in the app to the batch's families. Off by default — 11 to 15 lectures a day is a lot of messages."
            value={v.lectureReminders.enabled}
            onChange={(b) => set({ lectureReminders: { ...v.lectureReminders, enabled: b } })}
            testID="reminders-enabled"
          />
          {v.lectureReminders.enabled ? (
            <NumberField
              label="Remind this long before"
              value={v.lectureReminders.minutesBefore}
              onChange={(n) => set({ lectureReminders: { ...v.lectureReminders, minutesBefore: Math.max(5, n) } })}
              max={600}
            />
          ) : null}
          <ToggleRow
            label="Teachers see their own salary"
            value={v.facultyApp.salary}
            onChange={(b) => set({ facultyApp: { ...v.facultyApp, salary: b } })}
            testID="faculty-salary"
          />
          <ToggleRow
            label="Teachers can cancel their own lecture"
            hint="With a reason; the families are told, as when the office cancels."
            value={v.facultyApp.cancelLecture}
            onChange={(b) => set({ facultyApp: { ...v.facultyApp, cancelLecture: b } })}
            testID="faculty-cancel"
          />
        </VStack>
      </Card>

      <HStack gap={8}>
        <Button label="Save settings" onPress={submit} loading={save.isPending} disabled={!draft} testID="settings-save" />
        {draft ? <Button label="Undo changes" variant="ghost" onPress={() => setDraft(null)} /> : null}
      </HStack>
    </VStack>
  );
}
