import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Fingerprint, Wifi, ShieldAlert, Clock, UserCheck, Timer, UserX, Hourglass, BellRing, CalendarCheck, BookOpen, AlertTriangle } from "lucide-react-native";

import { Screen, VStack, Text, StatTile, Banner, Card, useBreakpoint } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { formatRelative, academyToday } from "@shared/format";
import { useDevices } from "@modules/devices/hooks/useDevices";
import { useBoard, useLeaveList } from "@modules/attendance/hooks/useAttendance";
import { useAlertReach } from "@modules/notifications/hooks/useNotifications";
import { useLectureList } from "@modules/lectures/hooks/useLectures";
import { MoneyTiles } from "@modules/expenses/components/MoneyTiles";

/**
 * Built from what the signed-in person may see: a tile appears only when the
 * permission behind it is held, so a teacher's dashboard and the owner's are
 * different screens.
 */
export default function DashboardScreen() {
  const { isWide } = useBreakpoint();
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const name = useAuthStore((s) => s.staff?.name ?? "");
  const roleLabel = useAuthStore((s) => s.staff?.roleLabel ?? "");
  const canDevices = useAuthStore((s) => s.hasPermission(PERMISSIONS.DEVICES_VIEW) || s.hasPermission(PERMISSIONS.DEVICES_MANAGE));
  const canAttendance = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_VIEW) || s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE));
  const canMoney = useAuthStore(
    (s) =>
      s.hasPermission(PERMISSIONS.FEES_VIEW) ||
      s.hasPermission(PERMISSIONS.FEES_COLLECT) ||
      s.hasPermission(PERMISSIONS.FEES_MANAGE) ||
      s.hasPermission(PERMISSIONS.EXPENSES_MANAGE),
  );
  const canLectures = useAuthStore((s) => s.hasPermission(PERMISSIONS.LECTURES_VIEW) || s.hasPermission(PERMISSIONS.LECTURES_MANAGE));
  const canAlerts = useAuthStore((s) => s.hasPermission(PERMISSIONS.ATTENDANCE_MANAGE) || s.hasPermission(PERMISSIONS.MESSAGES_BROADCAST));

  return (
    <Screen title={`Hello, ${name.split(" ")[0] || "there"}`} subtitle={roleLabel} testID="dashboard-screen">
      <VStack gap={16}>
        {canMoney ? <MoneyTiles wide={isWide} /> : null}
        {canAttendance ? <AttendanceTiles wide={isWide} onOpen={() => nav.navigate("Today")} /> : null}
        {canAttendance || canAlerts ? (
          <FamilyTiles wide={isWide} showLeaves={canAttendance} showReach={canAlerts} onOpen={(name) => nav.navigate(name)} />
        ) : null}
        {canLectures ? <LectureTiles wide={isWide} onOpen={() => nav.navigate("Lectures")} /> : null}
        {canDevices ? <DeviceTiles wide={isWide} onOpen={() => nav.navigate("Devices")} /> : null}
        {!canDevices && !canAttendance && !canMoney ? (
          <Card>
            <Text tone="secondary">Your attendance registers and lectures will appear here.</Text>
          </Card>
        ) : null}
      </VStack>
    </Screen>
  );
}

/** Today across every batch that meets: the numbers the owner asks for first. */
function AttendanceTiles({ wide, onOpen }: { wide: boolean; onOpen: () => void }) {
  const board = useBoard();
  const meeting = (board.data?.batches ?? []).filter((b) => b.meetsToday);
  const sum = (k: "present" | "late" | "absent") => meeting.reduce((n, b) => n + (b.counts[k] ?? 0), 0);
  const notYet = meeting.reduce((n, b) => n + b.notYet, 0);
  return (
    <View style={[styles.tiles, wide && styles.tilesWide]}>
      <StatTile label="In class today" value={sum("present")} icon={UserCheck} onPress={onOpen} testID="tile-present" />
      <StatTile label="Late" value={sum("late")} icon={Timer} onPress={onOpen} />
      <StatTile label="Absent" value={sum("absent")} icon={UserX} attention={sum("absent") > 0} onPress={onOpen} />
      <StatTile label="Not in yet" value={notYet} icon={Hourglass} onPress={onOpen} />
    </View>
  );
}

/** Leave waiting for a decision, and how many families an alert reaches. */
function FamilyTiles({
  wide,
  showLeaves,
  showReach,
  onOpen,
}: {
  wide: boolean;
  showLeaves: boolean;
  showReach: boolean;
  onOpen: (name: string) => void;
}) {
  const pending = useLeaveList({ status: "pending" });
  const reach = useAlertReach(showReach);
  const waiting = (pending.data ?? []).filter((l) => l.source === "parent").length;
  const a = reach.data?.adoption;
  return (
    <View style={[styles.tiles, wide && styles.tilesWide]}>
      {showLeaves ? (
        <StatTile label="Leave to decide" value={waiting} icon={CalendarCheck} attention={waiting > 0} onPress={() => onOpen("Leaves")} testID="tile-leaves" />
      ) : null}
      {showReach && a ? (
        <StatTile
          label="Families with app alerts"
          value={`${a.withPush}/${a.families}`}
          sublabel={reach.data?.fallback === "none" ? "No SMS for the rest" : `The rest by ${reach.data?.fallback === "sms" ? "SMS" : "WhatsApp"}`}
          icon={BellRing}
          onPress={() => onOpen("Alerts")}
          testID="tile-reach"
        />
      ) : null}
    </View>
  );
}

/** Today's lectures, and those the punches could not settle. */
function LectureTiles({ wide, onOpen }: { wide: boolean; onOpen: () => void }) {
  const today = useLectureList({ date: academyToday() });
  const list = (today.data ?? []).filter((l) => l.status === "scheduled");
  const toConfirm = list.filter((l) => l.state === "overdue").length;
  const noTeacher = list.filter((l) => !l.teacherId).length;
  return (
    <View style={[styles.tiles, wide && styles.tilesWide]}>
      <StatTile label="Lectures today" value={list.length} icon={BookOpen} onPress={onOpen} testID="tile-lectures" />
      <StatTile label="To confirm" value={toConfirm} icon={AlertTriangle} attention={toConfirm > 0} onPress={onOpen} />
      <StatTile label="No teacher set" value={noTeacher} attention={noTeacher > 0} onPress={onOpen} />
    </View>
  );
}

function DeviceTiles({ wide, onOpen }: { wide: boolean; onOpen: () => void }) {
  const devices = useDevices();
  const list = devices.data ?? [];
  const approved = list.filter((d) => d.status === "approved");
  const online = approved.filter((d) => d.online).length;
  const pending = list.filter((d) => d.status === "pending").length;
  const lastPunch = approved
    .map((d) => d.lastPunchAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <VStack gap={12}>
      {approved.length > 0 && online < approved.length ? (
        <Banner
          tone="danger"
          title="A fingerprint machine is offline"
          message="Punches are stored on the machine and arrive when it reconnects. Check its power and internet."
        />
      ) : null}
      <View style={[styles.tiles, wide && styles.tilesWide]}>
        <StatTile label="Machines online" value={`${online}/${approved.length}`} icon={Wifi} attention={online < approved.length} onPress={onOpen} />
        <StatTile label="Waiting for approval" value={pending} icon={ShieldAlert} attention={pending > 0} onPress={onOpen} />
        <StatTile label="Last punch" value={lastPunch ? formatRelative(lastPunch) : "none yet"} icon={Clock} onPress={onOpen} />
        <StatTile label="Machines" value={list.length} icon={Fingerprint} onPress={onOpen} />
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 12 },
  tilesWide: { flexDirection: "row", flexWrap: "wrap" },
});
