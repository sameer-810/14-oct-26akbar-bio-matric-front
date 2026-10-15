import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, VStack, HStack, Card, Text, Button, Banner, Skeleton, ErrorState } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { formatDay, formatTime } from "@shared/format";
import { useLectureRegister, useAttendanceActions } from "../hooks/useAttendance";
import type { RegistersParamList } from "../RegistersNavigator";

type Props = NativeStackScreenProps<RegistersParamList, "LectureRegister">;

const REASONS: Record<string, string> = { punch: "punched", carried: "stayed from the last lecture", "no punch": "no punch" };

/**
 * The old system's "Mark Attendance" page, filled in already from the
 * punches. Staff only flip the exceptions; each flip is kept as a hand
 * correction the engine never overwrites.
 */
export default function LectureRegisterScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const reg = useLectureRegister(id);
  const act = useAttendanceActions();
  const canCorrect = useAuthStore(
    (s) => s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE) || s.hasPermission(PERMISSIONS.LECTURES_MANAGE) || s.hasPermission(PERMISSIONS.EXAMS_MARKS),
  );
  const [changes, setChanges] = useState<Record<string, "present" | "absent">>({});
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  if (reg.isLoading) return <Screen title="Lecture"><Skeleton height={200} /></Screen>;
  if (reg.error || !reg.data) return <Screen title="Lecture"><ErrorState error={reg.error} onRetry={() => void reg.refetch()} /></Screen>;
  const { session, rows } = reg.data;
  const effective = (studentId: string, status: "present" | "absent" | null) => changes[studentId] ?? status;
  const present = rows.filter((r) => effective(r.studentId, r.status) === "present").length;

  async function save() {
    setMsg(null);
    try {
      await act.setLectureMarks.mutateAsync({
        id,
        marks: Object.entries(changes).map(([studentId, status]) => ({ studentId, status, remark: "Corrected on the register" })),
      });
      setChanges({});
      setMsg({ tone: "success", text: "Saved. These marks are now fixed by hand." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Screen
      title={`${session.subject || "Lecture"} ${session.startTime}–${session.endTime}`}
      overline={formatDay(session.date)}
      right={<Button label="Back to register" variant="ghost" size="sm" onPress={() => navigation.goBack()} />}
      testID="lecture-register"
    >
      <VStack gap={12}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {session.status === "cancelled" ? <Banner tone="warning" message="This lecture was cancelled." /> : null}
        <Text tone="secondary">
          {present} of {rows.length} present{session.markedAt ? "" : " so far — absences are marked once the lecture's marking time has passed"}
        </Text>
        <Card>
          <VStack gap={0}>
            {rows.map((r) => {
              const status = effective(r.studentId, r.status);
              const changed = changes[r.studentId] !== undefined;
              return (
                <HStack key={r.studentId} gap={8} align="center" wrap style={styles.row}>
                  <Text variant="body-sm" tabular style={{ width: 64 }}>{r.grNumber}</Text>
                  <VStack gap={1} style={{ flex: 1, minWidth: 140 }}>
                    <Text variant="body-sm">{r.name}</Text>
                    <Text variant="caption" tone="tertiary">
                      {r.source === "manual" ? `set by hand${r.reason ? ` — ${r.reason}` : ""}` : r.reason ? REASONS[r.reason] ?? r.reason : "waiting"}
                      {r.punches.length ? ` · punches ${r.punches.map((p) => formatTime(p)).join(", ")}` : ""}
                    </Text>
                  </VStack>
                  <HStack gap={4}>
                    {(["present", "absent"] as const).map((s) => (
                      <Pressable
                        key={s}
                        disabled={!canCorrect || session.status === "cancelled"}
                        onPress={() => setChanges((c) => (r.status === s ? Object.fromEntries(Object.entries(c).filter(([k]) => k !== r.studentId)) : { ...c, [r.studentId]: s }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: status === s }}
                        accessibilityLabel={`${r.name} ${s}`}
                        style={[styles.toggle, status === s && (s === "present" ? styles.on : styles.off), changed && status === s && styles.changed]}
                        testID={`mark-${r.grNumber}-${s}`}
                      >
                        <Text variant="label" style={{ color: status === s ? palette.text.inverse : palette.text.secondary }}>
                          {s === "present" ? "P" : "A"}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        </Card>
        {canCorrect && Object.keys(changes).length ? (
          <HStack gap={8}>
            <Button label={`Save ${Object.keys(changes).length} change${Object.keys(changes).length === 1 ? "" : "s"}`} onPress={save} loading={act.setLectureMarks.isPending} testID="lecture-save" />
            <Button label="Undo" variant="ghost" onPress={() => setChanges({})} />
          </HStack>
        ) : null}
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border.subtle },
  toggle: {
    width: 40,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface.primary,
  },
  on: { backgroundColor: palette.success.text, borderColor: palette.success.text },
  off: { backgroundColor: palette.danger.text, borderColor: palette.danger.text },
  changed: { borderWidth: 2, borderColor: palette.warning.text },
});
