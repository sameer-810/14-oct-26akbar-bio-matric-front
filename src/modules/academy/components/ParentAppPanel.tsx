import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, ToggleRow, TextField, Text } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useUpdateSettings } from "../hooks/useAcademy";
import type { InstituteSettings } from "../types";

type Draft = Pick<InstituteSettings, "messageTemplates" | "parentApp">;

const SAMPLE = { name: "Ayesha", gr: "10501", time: "4:02 pm", date: "14 Oct 2026" };

/** The alert as a parent will read it. */
function preview(tpl: string, academy: string) {
  return tpl.replace(/\{(name|gr|time|date|academy)\}/g, (_, k: keyof typeof SAMPLE | "academy") => (k === "academy" ? academy : SAMPLE[k]));
}

/**
 * The old system's "Student Login" switches and its SMS wording, in one
 * place. The wording starts as the old system's own, so families read the
 * same message they are used to.
 */
export function ParentAppPanel({ settings }: { settings: InstituteSettings }) {
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const v: Draft = draft ?? { messageTemplates: settings.messageTemplates, parentApp: settings.parentApp };
  const setTpl = (k: keyof Draft["messageTemplates"], t: string) => setDraft({ ...v, messageTemplates: { ...v.messageTemplates, [k]: t } });
  const setSection = (k: keyof Draft["parentApp"], b: boolean) => setDraft({ ...v, parentApp: { ...v.parentApp, [k]: b } });

  async function submit() {
    setMsg(null);
    try {
      await save.mutateAsync(v);
      setDraft(null);
      setMsg({ tone: "success", text: "Saved. The next alert uses it." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <VStack gap={16}>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      <Card>
        <VStack gap={12}>
          <SectionHeader title="What parents see in the app" />
          <ToggleRow
            label="Fingerprint punch times"
            hint="Every punch of the day, not just reached and left."
            value={v.parentApp.punches}
            onChange={(b) => setSection("punches", b)}
            testID="parentapp-punches"
          />
          <ToggleRow label="Lecture attendance" value={v.parentApp.lectures} onChange={(b) => setSection("lectures", b)} testID="parentapp-lectures" />
          <ToggleRow
            label="Leave applications"
            hint="Parents apply in the app; staff approve under Leave requests."
            value={v.parentApp.leaveApplication}
            onChange={(b) => setSection("leaveApplication", b)}
            testID="parentapp-leave"
          />
          <ToggleRow label="Fees" hint="What is due and every receipt." value={v.parentApp.fees} onChange={(b) => setSection("fees", b)} testID="parentapp-fees" />
          <ToggleRow label="Test results" hint="Marks, rank and class average once a test is published." value={v.parentApp.results} onChange={(b) => setSection("results", b)} testID="parentapp-results" />
          <ToggleRow label="Documents" hint="Worksheets and notes shared with them." value={v.parentApp.documents} onChange={(b) => setSection("documents", b)} testID="parentapp-documents" />
          <ToggleRow
            label="Questions and issues"
            hint="Parents write to the academy and see the reply (the old feedback form)."
            value={v.parentApp.issues}
            onChange={(b) => setSection("issues", b)}
            testID="parentapp-issues"
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="Alert wording" subtitle="Use {name} {gr} {time} {date} {academy}. The same text goes by app, SMS or WhatsApp." />
          {(["entry", "exit", "absent"] as const).map((k) => (
            <VStack key={k} gap={4}>
              <TextField
                label={k === "entry" ? "Reached class" : k === "exit" ? "Left class" : "Absent"}
                value={v.messageTemplates[k]}
                onChangeText={(t) => setTpl(k, t)}
                multiline
                maxLength={300}
                testID={`template-${k}`}
              />
              <Text variant="caption" tone="tertiary">
                {preview(v.messageTemplates[k], settings.name)}
              </Text>
            </VStack>
          ))}
          <Banner
            tone="info"
            message="For SMS in India the wording must match a template registered with your SMS provider (DLT), or the message is silently dropped."
          />
        </VStack>
      </Card>

      <HStack gap={8}>
        <Button label="Save" onPress={submit} loading={save.isPending} disabled={!draft} testID="parentapp-save" />
        {draft ? <Button label="Undo changes" variant="ghost" onPress={() => setDraft(null)} /> : null}
      </HStack>
    </VStack>
  );
}
