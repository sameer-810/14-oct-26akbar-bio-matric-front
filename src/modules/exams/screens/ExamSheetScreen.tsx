import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, VStack, HStack, Card, Text, Button, Banner, Skeleton, ErrorState, EmptyState, StatTile, StatusChip, TextField, ToggleRow } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorCode, apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDateTime, formatDay, formatWallTime } from "@shared/format";
import { canPrint, escapeHtml, printHtml } from "@shared/print/printHtml";
import { LOGO_DATA_URI } from "@shared/print/logo";
import { useSettings } from "@modules/academy/hooks/useAcademy";
import { useExamActions, useExamSheet } from "../hooks/useExams";
import { examChipStatus, showMarks, type Exam, type ExamSheet, type MarkRow, type SheetRow } from "../types";
import type { ExamsParamList } from "../ExamsNavigator";

type Props = NativeStackScreenProps<ExamsParamList, "ExamSheet">;

/** One student's line as typed, before it is saved. */
type Draft = { marks: string; absent: boolean; remark: string };

const baseOf = (r: SheetRow): Draft => ({ marks: r.marks === null ? "" : String(r.marks), absent: r.absent, remark: r.remark });

/** Marks the server will take: whole or half, not above the maximum. Empty means "not entered". */
function marksError(text: string, max: number) {
  const t = text.trim();
  if (!t) return undefined;
  if (!/^\d+(\.\d+)?$/.test(t)) return "Numbers only";
  const n = Number(t);
  if (!Number.isInteger(n * 2)) return "Whole or half marks";
  if (n > max) return `At most ${max}`;
  return undefined;
}

/** An absent student's marks do not count, so they are not a change. */
function isChanged(d: Draft, r: SheetRow) {
  const b = baseOf(r);
  if (d.absent !== b.absent || d.remark.trim() !== b.remark) return true;
  return !d.absent && d.marks.trim() !== b.marks;
}

function toMarkRow(studentId: string, d: Draft): MarkRow {
  const t = d.marks.trim();
  return { studentId, absent: d.absent, marks: d.absent || !t ? null : Number(t), remark: d.remark.trim() };
}

/**
 * The marks sheet for one test: the roster of its batches on the day, filled
 * in by the teacher and saved in one go. Publishing sends each family their
 * child's mark with the class average and highest; announcing sends the date
 * and topics beforehand.
 */
export default function ExamSheetScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const sheet = useExamSheet(id);
  const act = useExamActions();
  const settings = useSettings();
  const canMarks = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXAMS_MARKS) || s.hasPermission(PERMISSIONS.EXAMS_PUBLISH));
  const canPublish = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXAMS_PUBLISH));
  const [today] = useState(() => academyToday());
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  /** set when the server refused to publish over missing marks */
  const [missing, setMissing] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);

  // a deep link opens the sheet with nothing behind it
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("ExamsList"));
  const backButton = <Button label="All tests" variant="ghost" size="sm" onPress={back} testID="exam-back" />;

  if (sheet.isLoading) {
    return (
      <Screen title="Test" right={backButton} testID="exam-sheet">
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (sheet.error || !sheet.data) {
    return (
      <Screen title="Test" right={backButton} testID="exam-sheet">
        <ErrorState error={sheet.error} onRetry={() => void sheet.refetch()} />
      </Screen>
    );
  }

  const data = sheet.data;
  const { exam: e, stats, rows } = data;
  const editable = canMarks && e.status !== "cancelled";
  const published = e.status === "published";
  const valueOf = (r: SheetRow) => draft[r.studentId] ?? baseOf(r);
  const changed = rows.filter((r) => draft[r.studentId] && isChanged(draft[r.studentId], r));
  const invalid = changed.some((r) => !valueOf(r).absent && marksError(valueOf(r).marks, e.maxMarks));
  const edit = (r: SheetRow, patch: Partial<Draft>) => setDraft((d) => ({ ...d, [r.studentId]: { ...(d[r.studentId] ?? baseOf(r)), ...patch } }));
  const busy = act.setMarks.isPending || act.publish.isPending || act.announce.isPending || act.cancel.isPending;

  async function run(fn: () => Promise<string>) {
    setMsg(null);
    try {
      setMsg({ tone: "success", text: await fn() });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  const save = () =>
    run(async () => {
      await act.setMarks.mutateAsync({ id, rows: changed.map((r) => toMarkRow(r.studentId, valueOf(r))) });
      setDraft({});
      return `Saved marks for ${changed.length} student${changed.length === 1 ? "" : "s"}.`;
    });

  async function publish(force: boolean) {
    setMsg(null);
    try {
      const s = await act.publish.mutateAsync({ id, force });
      setMissing(null);
      const told = s.told ?? 0;
      setMsg({ tone: "success", text: `Results sent to ${told} famil${told === 1 ? "y" : "ies"}.` });
    } catch (err) {
      if (!force && apiErrorCode(err) === "MARKS_MISSING") {
        // the count leads the server's message; the sheet's own count is the fallback
        const n = Number.parseInt(apiErrorMessage(err), 10);
        setMissing(Number.isFinite(n) ? n : stats.notEntered);
      } else {
        setMsg({ tone: "danger", text: apiErrorMessage(err) });
      }
    }
  }

  const announce = () =>
    run(async () => {
      const r = await act.announce.mutateAsync(id);
      return `Told ${r.familiesTold} famil${r.familiesTold === 1 ? "y" : "ies"} about the test.`;
    });

  const cancel = () =>
    run(async () => {
      const r = await act.cancel.mutateAsync({ id, reason: reason.trim() || undefined, notify });
      setCancelling(false);
      return r.familiesTold ? `Cancelled. Told ${r.familiesTold} famil${r.familiesTold === 1 ? "y" : "ies"}.` : "Cancelled.";
    });

  const details = [
    `Out of ${e.maxMarks}`,
    `pass mark ${e.passingMarks}`,
    e.announcedAt ? `announced ${formatDateTime(e.announcedAt)}` : null,
    e.publishedAt ? `results sent ${formatDateTime(e.publishedAt)}` : null,
  ].filter(Boolean);

  return (
    <Screen
      title={e.name}
      overline={`${formatDay(e.date)}${e.startTime ? ` · ${formatWallTime(e.startTime)}` : ""}`}
      subtitle={[e.subject, e.batchNames?.filter(Boolean).join(", ")].filter(Boolean).join(" · ") || undefined}
      right={
        <HStack gap={8}>
          {canPrint ? (
            <Button label="Print result sheet" variant="secondary" size="sm" onPress={() => printSheet(data, settings.data?.name ?? "")} testID="exam-print" />
          ) : null}
          {backButton}
        </HStack>
      }
      refreshing={sheet.isRefetching}
      onRefresh={() => void sheet.refetch()}
      testID="exam-sheet"
    >
      <VStack gap={12}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {e.status === "cancelled" ? (
          <Banner tone="warning" title="This test was cancelled" message={e.cancelReason || "No reason was given."} />
        ) : null}

        <HStack gap={8} align="center" wrap>
          <StatusChip status={examChipStatus(e, today)} size="sm" />
          <Text variant="body-sm" tone="secondary">
            {details.join(" · ")}
          </Text>
        </HStack>
        {e.topics ? <Text variant="body-sm">Topics: {e.topics}</Text> : null}

        <HStack gap={12} wrap>
          <StatTile label="Appeared" value={stats.appeared} sublabel={`of ${stats.students}`} testID="exam-stat-appeared" />
          <StatTile label="Absent" value={stats.absent} testID="exam-stat-absent" />
          <StatTile
            label="Not entered"
            value={stats.notEntered}
            accent="amber"
            attention={stats.notEntered > 0 && e.status !== "cancelled" && e.date <= today}
            testID="exam-stat-not-entered"
          />
          <StatTile
            label="Average"
            value={showMarks(stats.average)}
            sublabel={stats.averagePercent !== null ? `${stats.averagePercent}%` : undefined}
            testID="exam-stat-average"
          />
          <StatTile label="Highest" value={showMarks(stats.highest)} testID="exam-stat-highest" />
          <StatTile
            label="Pass %"
            value={stats.passPercent !== null ? `${stats.passPercent}%` : "—"}
            sublabel={stats.appeared ? `${stats.passed} passed` : undefined}
            testID="exam-stat-pass"
          />
        </HStack>

        {canMarks && e.status === "scheduled" && !cancelling ? (
          <HStack gap={8} wrap>
            {e.date >= today ? (
              <Button label="Announce to families" variant="secondary" size="sm" onPress={announce} loading={act.announce.isPending} disabled={busy} testID="exam-announce" />
            ) : null}
            {canPublish ? (
              <Button label="Publish results" size="sm" onPress={() => void publish(false)} loading={act.publish.isPending} disabled={busy || changed.length > 0} testID="exam-publish" />
            ) : null}
            <Button label="Cancel test…" variant="ghost" size="sm" onPress={() => setCancelling(true)} disabled={busy} testID="exam-cancel" />
          </HStack>
        ) : null}
        {canPublish && published ? (
          <HStack gap={8} align="center" wrap>
            <Button label="Send results again" variant="secondary" size="sm" onPress={() => void publish(false)} loading={act.publish.isPending} disabled={busy || changed.length > 0} testID="exam-publish" />
            <Text variant="caption" tone="tertiary">
              Only families not yet sent a result get one — use it after filling in marks that were missing.
            </Text>
          </HStack>
        ) : null}
        {canPublish && changed.length > 0 && e.status !== "cancelled" ? (
          <Text variant="caption" tone="warning">
            Save the marks before publishing.
          </Text>
        ) : null}

        {missing !== null ? (
          <Banner
            tone="warning"
            title={`${missing} student${missing === 1 ? " has" : "s have"} no marks`}
            message="They are neither marked nor absent, so their families will get nothing. Publish anyway?"
            action={
              <HStack gap={8}>
                <Button label="Publish anyway" size="sm" onPress={() => void publish(true)} loading={act.publish.isPending} testID="exam-publish-force" />
                <Button label="Not yet" variant="ghost" size="sm" onPress={() => setMissing(null)} />
              </HStack>
            }
          />
        ) : null}

        {cancelling ? (
          <Card>
            <VStack gap={8}>
              <TextField label="Why" value={reason} onChangeText={setReason} placeholder="Optional — sent to families" maxLength={200} testID="exam-cancel-reason" />
              {e.date >= today ? <ToggleRow label="Tell the families in the app" value={notify} onChange={setNotify} /> : null}
              <HStack gap={8}>
                <Button label="Cancel the test" variant="destructive" size="sm" onPress={cancel} loading={act.cancel.isPending} testID="exam-cancel-confirm" />
                <Button label="Keep it" variant="ghost" size="sm" onPress={() => setCancelling(false)} />
              </HStack>
            </VStack>
          </Card>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState title="No students in these batches on this day" message="The roster is the batches' students on the test's date." />
        ) : (
          <Card>
            <VStack gap={0}>
              {rows.map((r) => {
                const d = valueOf(r);
                const err = d.absent ? undefined : marksError(d.marks, e.maxMarks);
                const dirty = Boolean(draft[r.studentId]) && isChanged(d, r);
                const failed = published && !r.absent && r.marks !== null && r.marks < e.passingMarks;
                return (
                  <HStack key={r.studentId} gap={8} align="center" wrap style={[styles.row, dirty && styles.dirty]}>
                    <Text variant="body-sm" tabular style={{ width: 64 }}>
                      {r.grNumber}
                    </Text>
                    <VStack gap={1} style={{ flex: 1, minWidth: 140 }}>
                      <Text variant="body-sm">{r.name}</Text>
                      {r.batchName ? (
                        <Text variant="caption" tone="tertiary">
                          {r.batchName}
                        </Text>
                      ) : null}
                    </VStack>
                    <TextField
                      value={d.absent ? "" : d.marks}
                      onChangeText={(t) => edit(r, { marks: t })}
                      placeholder={d.absent ? "AB" : `/ ${e.maxMarks}`}
                      editable={editable && !d.absent}
                      numericField
                      keyboardType="decimal-pad"
                      error={err}
                      accessibilityLabel={`${r.name} marks out of ${e.maxMarks}`}
                      containerStyle={{ width: 96 }}
                      testID={`marks-${r.grNumber}`}
                    />
                    <Pressable
                      disabled={!editable}
                      onPress={() => edit(r, d.absent ? { absent: false } : { absent: true, marks: "" })}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: d.absent, disabled: !editable }}
                      accessibilityLabel={`${r.name} absent`}
                      style={[styles.absent, d.absent && styles.absentOn]}
                      testID={`absent-${r.grNumber}`}
                    >
                      <Text variant="label" style={{ color: d.absent ? palette.text.inverse : palette.text.secondary }}>
                        Absent
                      </Text>
                    </Pressable>
                    <TextField
                      value={d.remark}
                      onChangeText={(t) => edit(r, { remark: t })}
                      placeholder="Remark"
                      editable={editable}
                      maxLength={200}
                      accessibilityLabel={`${r.name} remark`}
                      containerStyle={{ flex: 1, minWidth: 140 }}
                      testID={`remark-${r.grNumber}`}
                    />
                    {published ? (
                      <VStack gap={1} style={{ width: 72 }}>
                        <Text variant="label" tabular>
                          {r.rank !== null ? `Rank ${r.rank}` : "—"}
                        </Text>
                        <Text variant="caption" tone={failed ? "danger" : "tertiary"} tabular>
                          {r.percent !== null ? `${r.percent}%` : r.absent ? "absent" : "—"}
                        </Text>
                      </VStack>
                    ) : null}
                  </HStack>
                );
              })}
            </VStack>
          </Card>
        )}

        {editable && rows.length > 0 ? (
          <HStack gap={8} align="center">
            <Button
              label={changed.length ? `Save marks (${changed.length})` : "Save marks"}
              onPress={() => void save()}
              loading={act.setMarks.isPending}
              disabled={changed.length === 0 || invalid || busy}
              testID="marks-save"
            />
            {Object.keys(draft).length ? <Button label="Undo changes" variant="ghost" onPress={() => setDraft({})} /> : null}
            {invalid ? (
              <Text variant="caption" tone="danger">
                Fix the marks shown in red first.
              </Text>
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    </Screen>
  );
}

/** The saved sheet as a printable page; every value from the server is escaped. */
function printSheet(s: ExamSheet, academy: string) {
  const e: Exam = s.exam;
  const st = s.stats;
  const result = (r: SheetRow) => (r.absent ? "Absent" : r.marks === null ? "—" : r.marks >= e.passingMarks ? "Pass" : "Fail");
  const tr = s.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.grNumber)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.batchName)}</td>` +
        `<td class="n">${escapeHtml(r.absent ? "AB" : showMarks(r.marks))}</td>` +
        `<td class="n">${escapeHtml(r.percent !== null ? `${r.percent}%` : "—")}</td>` +
        `<td class="n">${escapeHtml(r.rank !== null ? String(r.rank) : "—")}</td>` +
        `<td>${escapeHtml(result(r))}</td><td>${escapeHtml(r.remark)}</td></tr>`,
    )
    .join("");
  const facts = [
    e.subject,
    formatDay(e.date) + (e.startTime ? `, ${formatWallTime(e.startTime)}` : ""),
    e.batchNames?.filter(Boolean).join(", "),
    `Out of ${e.maxMarks}, pass mark ${e.passingMarks}`,
  ]
    .filter(Boolean)
    .map((f) => escapeHtml(String(f)))
    .join(" · ");
  const summary = [
    `Students ${st.students}`,
    `Appeared ${st.appeared}`,
    `Absent ${st.absent}`,
    `Not entered ${st.notEntered}`,
    `Average ${showMarks(st.average)}`,
    `Highest ${showMarks(st.highest)}`,
    `Lowest ${showMarks(st.lowest)}`,
    `Passed ${st.passed}${st.passPercent !== null ? ` (${st.passPercent}%)` : ""}`,
  ]
    .map((f) => escapeHtml(f))
    .join(" · ");
  printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(e.name)} — result sheet</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#0B1220}
  .logo{width:60px;height:60px;display:block;margin:0 0 8px} h1{font-size:20px;margin:0 0 2px} h2{font-size:15px;margin:0 0 10px;color:#3A4657;font-weight:600}
  p{margin:4px 0;color:#3A4657;font-size:13px}
  table{border-collapse:collapse;width:100%;margin-top:14px}
  th,td{border:1px solid #BFC6D0;padding:6px 8px;text-align:left;font-size:13px}
  th{background:#F6F8FA;font-weight:600} td.n{text-align:right;font-variant-numeric:tabular-nums}
  @media print{tr{page-break-inside:avoid}}
</style></head><body>
<img class="logo" src="${LOGO_DATA_URI}" alt="" />
${academy ? `<h2>${escapeHtml(academy)}</h2>` : ""}
<h1>${escapeHtml(e.name)} — result sheet</h1>
<p>${facts}</p>
<p>${summary}</p>
${e.status === "published" ? "" : `<p><b>${escapeHtml(e.status === "cancelled" ? "This test was cancelled." : "Results not yet published.")}</b></p>`}
<table><thead><tr><th>GR</th><th>Student</th><th>Batch</th><th>Marks</th><th>%</th><th>Rank</th><th>Result</th><th>Remark</th></tr></thead>
<tbody>${tr}</tbody></table>
</body></html>`);
}

const styles = StyleSheet.create({
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border.subtle },
  dirty: { borderLeftWidth: 3, borderLeftColor: palette.warning.text, paddingLeft: 6 },
  absent: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface.primary,
  },
  absentOn: { backgroundColor: palette.danger.text, borderColor: palette.danger.text },
});
