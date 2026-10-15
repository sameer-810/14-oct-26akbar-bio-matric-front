import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, Card, VStack, HStack, Text, Button, TextField, Select, StatusChip, Banner, ErrorState, Skeleton, SectionHeader, EmptyState, useBreakpoint } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, formatDateTime, formatDay } from "@shared/format";
import { useSettings } from "@modules/academy/hooks/useAcademy";
import { AdmissionSlip } from "@modules/students/components/AdmissionSlip";
import { useEnquiry, useEnquiryActions, useEnquiryAssignees } from "../hooks/useEnquiries";
import { TaskCard } from "../components/TaskCard";
import { AdmitPanel } from "../components/AdmitPanel";
import { HHMM, YMD, followUpInstant } from "../enquiryDates";
import {
  LOSS_REASON_LABELS,
  LOSS_REASON_OPTIONS,
  SOURCE_LABELS,
  STAGE_CHOICES,
  STAGE_LABELS,
  isOpenStage,
  type ConvertResult,
  type Enquiry,
  type EnquiryStage,
  type LossReason,
} from "../types";
import type { EnquiriesParamList } from "../EnquiriesNavigator";

type Props = NativeStackScreenProps<EnquiriesParamList, "EnquiryDetail">;
type AnyNav = { navigate: (name: string, params?: object) => void };

const RELATION = { father: "Father", mother: "Mother", guardian: "Guardian" } as const;

/**
 * One lead: who they are, how warm, every call made and planned, the notes,
 * and — when they decide to join — the admission, straight from here.
 */
export default function EnquiryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { isWide } = useBreakpoint();
  const canAdmit = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const seeAll = useAuthStore((s) => s.hasPermission(PERMISSIONS.ENQUIRIES_ALL));
  const settings = useSettings();
  const lead = useEnquiry(id);
  const l = lead.data;
  // the slip carries a password shown once, so it stays on screen after the lead refreshes to "joined"
  const [admitted, setAdmitted] = useState<{ result: ConvertResult; batchName: string } | null>(null);
  const openStudent = (studentId: string) => (navigation as unknown as AnyNav).navigate("Students", { screen: "StudentDetail", params: { id: studentId } });

  return (
    <Screen
      title={l ? l.name : "Enquiry"}
      subtitle={l ? `Enquiry #${l.number} · ${formatDay(l.enquiryDate)}` : undefined}
      right={<Button label="All enquiries" variant="ghost" fullWidth={false} onPress={() => navigation.navigate("EnquiriesList")} />}
      testID="enquiry-detail"
    >
      <VStack gap={16} style={{ maxWidth: isWide ? 900 : undefined }}>
        {lead.isLoading ? <Skeleton height={140} /> : null}
        {lead.error ? <ErrorState error={lead.error} onRetry={() => void lead.refetch()} /> : null}

        {admitted ? (
          <Card testID="enquiry-admitted">
            <VStack gap={12}>
              <AdmissionSlip
                academy={settings.data?.name ?? "Akbar's Academy"}
                studentName={admitted.result.student.name}
                grNumber={admitted.result.student.grNumber}
                biometricId={admitted.result.student.biometricId}
                batchName={admitted.batchName}
                username={admitted.result.parentLogin.username}
                temporaryPassword={admitted.result.parentLogin.temporaryPassword}
              />
              <Banner
                tone="info"
                title="Next: the fingerprint"
                message={`${admitted.result.student.firstName} is being added to the fingerprint machine as ${admitted.result.student.biometricId}. Enrol a finger there: Menu → User Mgt → find ${admitted.result.student.biometricId} → Fingerprint.`}
              />
              <HStack>
                <Button label="Open student" fullWidth={false} onPress={() => openStudent(admitted.result.student.id)} testID="enquiry-open-student" />
              </HStack>
            </VStack>
          </Card>
        ) : null}

        {l ? (
          <>
            <Card>
              <VStack gap={10}>
                <HStack gap={8} align="center" wrap>
                  <Text variant="h3" style={{ flex: 1 }}>
                    #{l.number} {l.name}
                  </Text>
                  <StatusChip status={STAGE_LABELS[l.stage]} />
                </HStack>
                {l.stage === "not_joined" && l.lossReason ? (
                  <Text variant="body-sm" tone="danger">
                    Did not join: {LOSS_REASON_LABELS[l.lossReason]}
                    {l.lossNote ? ` — ${l.lossNote}` : ""}
                  </Text>
                ) : null}
                <Details lead={l} />
              </VStack>
            </Card>

            {l.stage === "joined" && !admitted ? (
              <Card>
                <HStack gap={12} align="center" wrap>
                  <Text variant="body" style={{ flex: 1 }}>
                    Joined{l.convertedAt ? ` on ${formatDateTime(l.convertedAt)}` : ""}.
                  </Text>
                  {l.convertedStudentId ? (
                    <Button label="Joined — open student" fullWidth={false} onPress={() => openStudent(l.convertedStudentId ?? "")} testID="enquiry-open-student" />
                  ) : null}
                </HStack>
              </Card>
            ) : null}

            {l.stage !== "joined" ? <StagePanel key={`${l.id}:${l.stage}:${l.lossReason}:${l.lossNote}`} lead={l} /> : null}
            {seeAll && l.stage !== "joined" ? <AssigneePanel lead={l} /> : null}

            <FollowUps lead={l} />
            <Notes lead={l} />

            {canAdmit && isOpenStage(l.stage) && !admitted ? <AdmitPanel lead={l} onAdmitted={(result, batchName) => setAdmitted({ result, batchName })} /> : null}
          </>
        ) : null}
      </VStack>
    </Screen>
  );
}

function Details({ lead: l }: { lead: Enquiry }) {
  const rows: [string, React.ReactNode][] = [];
  for (const g of l.guardians) {
    rows.push([
      g.name ? `${RELATION[g.relation]} — ${g.name}` : RELATION[g.relation],
      g.phone ? <Phone key={g.phone} phone={g.phone} /> : "No mobile",
    ]);
  }
  if (l.phone) rows.push(["Student's mobile", <Phone key="student" phone={l.phone} />]);
  rows.push(
    ["School", l.schoolName || "—"],
    ["Standard", l.standardName || "—"],
    ["Source", `${SOURCE_LABELS[l.source]}${l.sourceNote ? ` — ${l.sourceNote}` : ""}`],
    ["Enquiry date", formatDay(l.enquiryDate)],
    ["Followed up by", l.assigneeName || "Nobody"],
  );
  if (l.dateOfBirth) rows.push(["Date of birth", formatDay(l.dateOfBirth)]);

  return (
    <VStack gap={6}>
      {rows.map(([k, v]) => (
        <HStack key={k} gap={12} align="center" wrap>
          <Text variant="body-sm" tone="secondary" style={{ width: 170 }}>
            {k}
          </Text>
          {typeof v === "string" ? <Text variant="body-sm">{v}</Text> : v}
        </HStack>
      ))}
    </VStack>
  );
}

/** A number one tap from a call — the whole job is phoning these families. */
function Phone({ phone }: { phone: string }) {
  return (
    <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)} accessibilityRole="link" accessibilityLabel={`Call ${phone}`} hitSlop={6}>
      <Text variant="body-sm" tone="link" weight="600">
        {phone}
      </Text>
    </Pressable>
  );
}

/** Stage changes. Not joined needs a reason — the loss report is built from it. */
function StagePanel({ lead: l }: { lead: Enquiry }) {
  const act = useEnquiryActions();
  const [stage, setStage] = useState<EnquiryStage>(l.stage);
  const [lossReason, setLossReason] = useState<LossReason | "">(l.lossReason);
  const [lossNote, setLossNote] = useState(l.lossNote);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const losing = stage === "not_joined";
  const changed = stage !== l.stage || (losing && (lossReason !== l.lossReason || lossNote.trim() !== l.lossNote));

  async function save() {
    setMsg(null);
    try {
      await act.update.mutateAsync({ id: l.id, patch: losing ? { stage, lossReason, lossNote: lossNote.trim() } : { stage } });
      setMsg({ tone: "success", text: `Stage set to ${STAGE_LABELS[stage].toLowerCase()}.` });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title="Stage" subtitle="Joining happens through Admit below, not here." />
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        <HStack gap={12} wrap align="flex-end">
          <View style={{ flex: 1, minWidth: 180 }} testID="enquiry-stage">
            <Select label="Stage" value={stage} options={STAGE_CHOICES} onChange={(s) => setStage(s as EnquiryStage)} disabled={act.update.isPending} />
          </View>
          {losing ? (
            <View style={{ flex: 1, minWidth: 180 }} testID="enquiry-loss">
              <Select
                label="Why did they not join?"
                value={lossReason || null}
                options={LOSS_REASON_OPTIONS}
                onChange={(r) => setLossReason(r as LossReason)}
                required
                placeholder="Choose a reason"
              />
            </View>
          ) : null}
        </HStack>
        {losing ? (
          <>
            <TextField label="Note" value={lossNote} onChangeText={setLossNote} placeholder="Optional — what they said" maxLength={300} testID="enquiry-loss-note" />
            {l.stage !== "not_joined" ? (
              <Text variant="caption" tone="warning">
                Their open follow-ups will be closed.
              </Text>
            ) : null}
          </>
        ) : null}
        <HStack>
          <Button
            label="Save stage"
            size="sm"
            fullWidth={false}
            onPress={save}
            loading={act.update.isPending}
            disabled={!changed || (losing && !lossReason)}
            testID="enquiry-stage-save"
          />
        </HStack>
      </VStack>
    </Card>
  );
}

/** Only those who see every lead can hand one to someone else; its open calls go with it. */
function AssigneePanel({ lead: l }: { lead: Enquiry }) {
  const act = useEnquiryActions();
  const assignees = useEnquiryAssignees();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function reassign(assigneeId: string) {
    if (assigneeId === l.assigneeId) return;
    setMsg(null);
    try {
      await act.update.mutateAsync({ id: l.id, patch: { assigneeId } });
      setMsg({ tone: "success", text: "Reassigned, with its open follow-ups." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Card>
      <VStack gap={10}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        <View testID="enquiry-assignee">
          <Select
            label="Followed up by"
            value={l.assigneeId}
            options={(assignees.data ?? []).map((a) => ({ value: a.id, label: a.name, sublabel: a.role.replace(/_/g, " ") }))}
            onChange={(a) => void reassign(a)}
            placeholder={assignees.isLoading ? "Loading staff…" : "Nobody"}
            disabled={act.update.isPending}
          />
        </View>
      </VStack>
    </Card>
  );
}

function FollowUps({ lead: l }: { lead: Enquiry }) {
  const act = useEnquiryActions();
  const [now] = useState(() => Date.now());
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => academyToday());
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tasks = l.tasks ?? [];
  const open = tasks.filter((t) => !t.done).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const done = tasks.filter((t) => t.done).sort((a, b) => Date.parse(b.doneAt ?? b.dueAt) - Date.parse(a.doneAt ?? a.dueAt));
  const canAdd = isOpenStage(l.stage);
  const valid = title.trim().length >= 2 && YMD.test(date.trim()) && HHMM.test(time.trim());

  async function add() {
    setError(null);
    try {
      await act.addTask.mutateAsync({ id: l.id, body: { title: title.trim(), dueAt: followUpInstant(date, time) } });
      setTitle("");
      setTime("");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <VStack gap={10}>
        <SectionHeader title="Follow-ups" subtitle={open.length ? `${open.length} open` : "Nothing planned"} />
        {open.map((t) => (
          <TaskCard key={t.id} task={t} now={now} />
        ))}
        {canAdd ? (
          <VStack gap={10} style={{ marginTop: open.length ? 6 : 0 }}>
            {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
            <Text variant="label" tone="secondary">
              Add follow-up
            </Text>
            <TextField label="What to do" value={title} onChangeText={setTitle} placeholder="Call back after the demo lecture" maxLength={140} testID="followup-title" />
            <HStack gap={12} wrap align="flex-end">
              <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 140 }} testID="followup-date" />
              <TextField label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" containerStyle={{ flex: 1, minWidth: 110 }} testID="followup-time" />
              <Button label="Add follow-up" size="sm" fullWidth={false} onPress={add} loading={act.addTask.isPending} disabled={!valid} testID="followup-add" />
            </HStack>
          </VStack>
        ) : null}
        {done.length ? (
          <VStack gap={8} style={{ marginTop: 6 }}>
            <Text variant="label" tone="secondary">
              Done
            </Text>
            {done.map((t) => (
              <TaskCard key={t.id} task={t} now={now} />
            ))}
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

function Notes({ lead: l }: { lead: Enquiry }) {
  const act = useEnquiryActions();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const notes = [...l.notes].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  async function add() {
    setError(null);
    try {
      await act.note.mutateAsync({ id: l.id, body: body.trim() });
      setBody("");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <VStack gap={10}>
        <SectionHeader title="Notes" />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <TextField label="Add a note" value={body} onChangeText={setBody} multiline maxLength={2000} placeholder="What was said, what they asked for" testID="enquiry-note" />
        <HStack>
          <Button label="Add note" size="sm" fullWidth={false} onPress={add} loading={act.note.isPending} disabled={!body.trim()} testID="enquiry-note-add" />
        </HStack>
        {notes.length === 0 ? <EmptyState title="No notes yet" /> : null}
        {notes.map((n) => (
          <VStack key={n.id} gap={2} style={{ paddingVertical: 6 }}>
            <Text variant="caption" tone="tertiary">
              {n.byName || "Staff"} · {formatDateTime(n.at)}
            </Text>
            <Text variant="body-sm">{n.body}</Text>
          </VStack>
        ))}
      </VStack>
    </Card>
  );
}
