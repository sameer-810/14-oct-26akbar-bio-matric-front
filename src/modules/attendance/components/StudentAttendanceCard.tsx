import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, VStack, HStack, Text, Button, TextField, SectionHeader, StatusChip, Banner, ChipsRow } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay, formatTime } from "@shared/format";
import { useCurrentYear } from "@modules/academy/hooks/useAcademy";
import { useStudentHistory, useLeaves, useAttendanceActions } from "../hooks/useAttendance";
import type { DayStatus } from "../types";

const COLORS: Record<DayStatus, string> = {
  present: palette.success.text,
  late: palette.warning.text,
  absent: palette.danger.text,
  leave: palette.info.text,
  holiday: palette.border.strong,
};

const back = (days: number) => academyToday(Date.now() - days * 86_400_000);

/**
 * A student's attendance at a glance — the same percentage the parent sees —
 * the last 30 days as a strip, and their leave.
 */
export function StudentAttendanceCard({ studentId, canManage }: { studentId: string; canManage: boolean }) {
  const [range, setRange] = useState<"30" | "90" | "year">("30");
  const year = useCurrentYear();
  const from = range === "year" && year ? year.startDate : back(range === "90" ? 90 : 30);
  const history = useStudentHistory(studentId, from, academyToday());
  const [showDays, setShowDays] = useState(false);
  const leaves = useLeaves(studentId);
  const act = useAttendanceActions();
  const [form, setForm] = useState<{ from: string; to: string; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const h = history.data;

  return (
    <Card>
      <VStack gap={10}>
        <SectionHeader
          title="Attendance"
          right={
            <ChipsRow
              chips={[
                { key: "30", label: "30 days" },
                { key: "90", label: "90 days" },
                { key: "year", label: "This year" },
              ]}
              active={range}
              onChange={(k) => setRange(k as "30" | "90" | "year")}
            />
          }
        />
        {h ? (
          <>
            <HStack gap={16} align="center" wrap>
              <Text variant="metric" testID="student-percent">
                {h.percent === null ? "—" : `${h.percent}%`}
              </Text>
              <Text variant="body-sm" tone="secondary">
                {h.counts.present ?? 0} present · {h.counts.late ?? 0} late · {h.counts.absent ?? 0} absent · {h.counts.leave ?? 0} leave
                {h.lectures.total ? ` · lectures ${h.lectures.present}/${h.lectures.total}` : ""}
              </Text>
            </HStack>
            <View style={styles.strip} accessibilityLabel="Day by day">
              {h.days.slice(-60).map((d) => (
                <View key={d.date} style={[styles.cell, { backgroundColor: COLORS[d.status] }]} accessibilityLabel={`${formatDay(d.date)} ${d.status}`} />
              ))}
            </View>
            {h.days.length ? (
              <Button
                label={showDays ? "Hide times" : `Show times (${h.days.length} days)`}
                size="xs"
                variant="ghost"
                onPress={() => setShowDays((v) => !v)}
              />
            ) : null}
            {showDays
              ? [...h.days].reverse().map((d) => {
                  const pairs = d.sessions?.length ? d.sessions : d.entryAt ? [{ inAt: d.entryAt, outAt: d.exitAt }] : [];
                  return (
                    <HStack key={d.date} gap={8} align="flex-start" testID={`day-${d.date}`}>
                      <Text variant="body-sm" style={{ width: 110 }}>
                        {formatDay(d.date)}
                      </Text>
                      <VStack gap={2} flex={1}>
                        {pairs.length ? (
                          pairs.map((p, i) => (
                            <Text key={i} variant="body-sm">
                              {formatTime(p.inAt)} – {p.outAt ? formatTime(p.outAt) : "no exit punch"}
                            </Text>
                          ))
                        ) : (
                          <Text variant="body-sm" tone="tertiary">
                            {d.status}
                          </Text>
                        )}
                      </VStack>
                      {d.source === "import" ? (
                        <Text variant="caption" tone="tertiary">
                          old system
                        </Text>
                      ) : null}
                    </HStack>
                  );
                })
              : null}
          </>
        ) : null}

        <Text variant="label" style={{ marginTop: 6 }}>
          Leave
        </Text>
        {(leaves.data ?? []).filter((l) => l.status !== "cancelled").map((l) => (
          <HStack key={l.id} gap={8} align="center" wrap>
            <Text variant="body-sm" style={{ flex: 1 }}>
              {formatDay(l.from)}
              {l.to !== l.from ? ` – ${formatDay(l.to)}` : ""}
              {l.reason ? ` · ${l.reason}` : ""}
            </Text>
            <StatusChip status={l.status} size="sm" />
            {canManage && l.status === "approved" ? (
              <Button label="Cancel" size="xs" variant="ghost" onPress={() => act.cancelLeave.mutate(l.id)} />
            ) : null}
          </HStack>
        ))}
        {leaves.data?.length === 0 ? <Text variant="body-sm" tone="tertiary">No leave.</Text> : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        {canManage ? (
          form ? (
            <HStack gap={8} wrap align="flex-end">
              <TextField label="From" value={form.from} onChangeText={(t) => setForm({ ...form, from: t })} placeholder="YYYY-MM-DD" containerStyle={{ width: 140 }} />
              <TextField label="To" value={form.to} onChangeText={(t) => setForm({ ...form, to: t })} placeholder="YYYY-MM-DD" containerStyle={{ width: 140 }} />
              <TextField label="Reason" value={form.reason} onChangeText={(t) => setForm({ ...form, reason: t })} containerStyle={{ flex: 1, minWidth: 140 }} />
              <Button
                label="Add leave"
                onPress={async () => {
                  setError(null);
                  try {
                    await act.addLeave.mutateAsync({ studentId, from: form.from, to: form.to || form.from, reason: form.reason });
                    setForm(null);
                  } catch (err) {
                    setError(apiErrorMessage(err));
                  }
                }}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setForm(null)} />
            </HStack>
          ) : (
            <Button label="Add leave" size="sm" variant="secondary" onPress={() => setForm({ from: academyToday(), to: "", reason: "" })} />
          )
        ) : null}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  cell: { width: 14, height: 22, borderRadius: radius.sm / 2 },
});
