import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Fingerprint } from "lucide-react-native";

import {
  Screen,
  Card,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  StatusChip,
  SectionHeader,
  Select,
  TextField,
  ToggleRow,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  useBreakpoint,
} from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { formatDay, formatDateTime, academyToday } from "@shared/format";
import { useBatches, useCurrentYear, useSettings } from "@modules/academy/hooks/useAcademy";
import { useDevices } from "@modules/devices/hooks/useDevices";
import { useStudent, useStudentActions } from "../hooks/useStudents";
import { AdmissionSlip } from "../components/AdmissionSlip";
import { StudentAttendanceCard } from "@modules/attendance/components/StudentAttendanceCard";
import { StudentFeesCard } from "@modules/fees/components/StudentFeesCard";
import type { StudentsParamList } from "../StudentsNavigator";

type Props = NativeStackScreenProps<StudentsParamList, "StudentDetail">;
type Panel = "batch" | "extend" | "left" | null;

export default function StudentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { isWide } = useBreakpoint();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));
  const canSeeAttendance = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_VIEW) || s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE));
  const canManageAttendance = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE));
  const canSeeDevices = useAuthStore((s) => s.hasPermission(PERMISSIONS.DEVICES_VIEW) || s.hasPermission(PERMISSIONS.DEVICES_MANAGE));
  const student = useStudent(id);
  const year = useCurrentYear();
  const settings = useSettings();
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const devices = useDevices({ enabled: canSeeDevices });
  const act = useStudentActions(id);

  const [panel, setPanel] = useState<Panel>(null);
  const [batchId, setBatchId] = useState("");
  const [validTill, setValidTill] = useState("");
  const [reason, setReason] = useState("");
  const [removeFromDevices, setRemoveFromDevices] = useState(true);
  const [confirmLeft, setConfirmLeft] = useState(false);
  const [slip, setSlip] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      setPanel(null);
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  };

  if (student.isLoading) return <Screen title="Student"><Skeleton height={240} /></Screen>;
  const s = student.data;
  if (student.error || !s) return <Screen title="Student"><ErrorState error={student.error} onRetry={() => void student.refetch()} /></Screen>;

  const batchName = (bid: string | null) =>
    bid ? (batches.data?.find((b) => b.id === bid)?.name ?? "another batch") : "Not in a batch";
  const deviceName = (did: string) => {
    const d = devices.data?.find((x) => x.id === did);
    return d ? d.name || d.serial : "a machine";
  };

  return (
    <Screen
      title={s.name}
      overline={`GR ${s.grNumber}`}
      right={<Button label="All students" variant="ghost" size="sm" onPress={() => navigation.navigate("StudentsList")} />}
      testID="student-detail"
    >
      <VStack gap={16}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {s.status !== "active" ? (
          <Banner
            tone="warning"
            message={s.status === "left" ? `Left on ${formatDay(s.leftOn)}${s.leftReason ? ` — ${s.leftReason}` : ""}.` : `Admission ended on ${formatDay(s.validTill)}. The parent app is closed until it is extended.`}
          />
        ) : null}
        {slip ? (
          <Card>
            <AdmissionSlip
              academy={settings.data?.name ?? "Akbar's Academy"}
              studentName={s.name}
              grNumber={s.grNumber}
              biometricId={s.biometricId}
              batchName={batchName(s.batchId)}
              username={slip.username}
              temporaryPassword={slip.temporaryPassword}
            />
          </Card>
        ) : null}

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <Card style={styles.cell}>
            <VStack gap={8}>
              <HStack gap={8} align="center" wrap>
                <StatusChip status={s.status} />
                <Text tone="secondary">{batchName(s.batchId)}</Text>
              </HStack>
              <Fact label="GR number" value={s.grNumber} />
              <Fact label="Fingerprint ID" value={s.biometricId} />
              <Fact label="Admitted" value={formatDay(s.admissionDate)} />
              <Fact label="Valid till" value={formatDay(s.validTill)} />
              {s.studentPhone ? <Fact label="Student mobile" value={s.studentPhone} /> : null}
              {s.schoolName ? <Fact label="School" value={s.schoolName} /> : null}
              {s.guardians.map((g) => (
                <Fact key={g.relation} label={g.relation[0].toUpperCase() + g.relation.slice(1)} value={[g.name, g.phone].filter(Boolean).join(" · ") || "—"} />
              ))}
              {s.parentLogin ? (
                <Fact
                  label="Parent login"
                  value={`${s.parentLogin.username}${s.parentLogin.children > 1 ? ` (${s.parentLogin.children} children)` : ""} · ${s.parentLogin.lastLoginAt ? `last in ${formatDateTime(s.parentLogin.lastLoginAt)}` : "never signed in"}`}
                />
              ) : null}
            </VStack>
          </Card>

          <Card style={styles.cell}>
            <VStack gap={8}>
              <SectionHeader title="Fingerprint" />
              <HStack gap={8} align="center">
                <Fingerprint size={20} color={s.enrolment.fingerprints.length ? palette.success.text : palette.warning.text} />
                <Text tone={s.enrolment.fingerprints.length ? "success" : "warning"} testID="student-finger-status">
                  {s.enrolment.fingerprints.length
                    ? `${s.enrolment.fingerprints.length} finger${s.enrolment.fingerprints.length === 1 ? "" : "s"} on file`
                    : "No finger enrolled yet"}
                </Text>
              </HStack>
              {!s.enrolment.fingerprints.length ? (
                <Text variant="body-sm" tone="secondary">
                  At the machine: Menu → User Mgt → find {s.biometricId} → Fingerprint. It shows here within a minute.
                </Text>
              ) : null}
              {canSeeDevices
                ? s.enrolment.devices.map((d) => (
                    <HStack key={d.deviceId} gap={8} align="center" wrap>
                      <Text variant="body-sm" style={{ flex: 1 }}>
                        On {deviceName(d.deviceId)}
                      </Text>
                      <StatusChip status={d.status} size="sm" />
                      {d.error ? (
                        <Text variant="caption" tone="danger">
                          {d.error}
                        </Text>
                      ) : null}
                    </HStack>
                  ))
                : null}
              {canManage && s.status === "active" ? (
                <Button label="Send to the machines again" size="sm" variant="secondary" onPress={() => run(() => act.resend.mutateAsync(), "Queued for every approved machine.")} />
              ) : null}
            </VStack>
          </Card>
        </View>

        {canSeeAttendance ? <StudentAttendanceCard studentId={s.id} canManage={canManageAttendance} /> : null}
        <StudentFeesCard studentId={s.id} />

        {canManage ? (
          <Card>
            <VStack gap={12}>
              <SectionHeader title="Changes" />
              <HStack gap={8} wrap>
                {s.status !== "left" ? <Button label="Change batch" variant="secondary" size="sm" onPress={() => setPanel(panel === "batch" ? null : "batch")} /> : null}
                {s.status !== "left" ? <Button label="Extend admission" variant="secondary" size="sm" onPress={() => setPanel(panel === "extend" ? null : "extend")} /> : null}
                {s.parentAccountId ? (
                  <Button
                    label="New parent password"
                    variant="secondary"
                    size="sm"
                    onPress={() =>
                      run(async () => {
                        setSlip(await act.resetParent.mutateAsync());
                      }, "A new slip is shown above. The parent's phones were signed out.")
                    }
                    testID="student-parent-reset"
                  />
                ) : null}
                {s.status !== "left" ? <Button label="Student has left" variant="destructive" size="sm" onPress={() => setPanel(panel === "left" ? null : "left")} /> : null}
              </HStack>

              {panel === "batch" ? (
                <VStack gap={10}>
                  <Select
                    label="Move to"
                    value={batchId || null}
                    options={(batches.data ?? []).filter((b) => b.id !== s.batchId && b.isActive).map((b) => ({ value: b.id, label: b.name, sublabel: `${b.startTime}–${b.endTime}` }))}
                    onChange={setBatchId}
                    placeholder="Choose a batch"
                  />
                  <Text variant="caption" tone="tertiary">
                    From today. Days before keep the old batch&apos;s timing.
                  </Text>
                  <Button label="Move" disabled={!batchId} onPress={() => run(() => act.changeBatch.mutateAsync({ batchId, from: academyToday() }), "Batch changed.")} />
                </VStack>
              ) : null}

              {panel === "extend" ? (
                <VStack gap={10}>
                  <TextField label="New last day" value={validTill} onChangeText={setValidTill} placeholder={year?.endDate ?? "YYYY-MM-DD"} />
                  <Button label="Extend" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(validTill)} onPress={() => run(() => act.extend.mutateAsync(validTill), "Extended.")} />
                </VStack>
              ) : null}

              {panel === "left" ? (
                <VStack gap={10}>
                  <TextField label="Reason (optional)" value={reason} onChangeText={setReason} />
                  <ToggleRow label="Remove from the fingerprint machines" hint="Their punches stop being accepted." value={removeFromDevices} onChange={setRemoveFromDevices} />
                  <Button label="Mark as left" variant="destructive" onPress={() => setConfirmLeft(true)} />
                </VStack>
              ) : null}
            </VStack>
          </Card>
        ) : null}
      </VStack>

      <ConfirmDialog
        visible={confirmLeft}
        title={`Mark ${s.firstName} as left?`}
        message="Attendance stops being recorded. If no brother or sister is still here, the parent app closes."
        confirmLabel="Mark as left"
        destructive
        loading={act.markLeft.isPending}
        onConfirm={() =>
          run(async () => {
            await act.markLeft.mutateAsync({ reason: reason || undefined, removeFromDevices });
            setConfirmLeft(false);
          }, "Marked as left.")
        }
        onCancel={() => setConfirmLeft(false)}
      />
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={8} align="flex-start">
      <Text variant="body-sm" tone="tertiary" style={{ width: 120 }}>
        {label}
      </Text>
      <Text variant="body-sm" style={{ flex: 1 }} selectable>
        {value}
      </Text>
    </HStack>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 16 },
  gridWide: { flexDirection: "row", alignItems: "flex-start" },
  cell: { flex: 1 },
});
