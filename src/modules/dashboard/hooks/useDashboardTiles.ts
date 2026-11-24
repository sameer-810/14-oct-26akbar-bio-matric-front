import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  IndianRupee,
  Receipt,
  Scale,
  FileClock,
  UserCheck,
  Timer,
  UserX,
  Hourglass,
  CalendarCheck,
  BellRing,
  BookOpen,
  AlertTriangle,
  Wifi,
  ShieldAlert,
  Clock,
  Fingerprint,
  type LucideIcon,
} from "lucide-react-native";

import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, formatPaise, formatRelative } from "@shared/format";
import { useMoneySummary } from "@modules/expenses/hooks/useExpenses";
import { useBoard, useLeaveList } from "@modules/attendance/hooks/useAttendance";
import { useAlertReach } from "@modules/notifications/hooks/useNotifications";
import { useLectureList } from "@modules/lectures/hooks/useLectures";
import { useDevices } from "@modules/devices/hooks/useDevices";
import { isEmptyFigure } from "../tileOrder";

export interface TileSpec {
  key: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  attention?: boolean;
  onPress?: () => void;
  testID?: string;
  /** the figure is nothing (0, ₹0, 0/633); such cards go to the bottom */
  empty: boolean;
}

/** Money figures move as the desk works, so the dashboard looks again every minute. */
const POLL = 60_000;

/**
 * Every card on the dashboard, in the order they are normally drawn, built
 * from what the signed-in person may see. The data, labels and what a card
 * opens are the same as when each group drew its own cards; the screen only
 * decides the final order (see tileOrder).
 */
export function useDashboardTiles() {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const can = useAuthStore((s) => s.hasPermission);
  const canFees = can(PERMISSIONS.FEES_VIEW) || can(PERMISSIONS.FEES_COLLECT) || can(PERMISSIONS.FEES_MANAGE);
  const canExpenses = can(PERMISSIONS.EXPENSES_MANAGE);
  const canMoney = canFees || canExpenses;
  const canAttendance = can(PERMISSIONS.ATTENDANCE_VIEW) || can(PERMISSIONS.ATTENDANCE_MANAGE);
  const canAlerts = can(PERMISSIONS.ATTENDANCE_MANAGE) || can(PERMISSIONS.MESSAGES_BROADCAST);
  const canLectures = can(PERMISSIONS.LECTURES_VIEW) || can(PERMISSIONS.LECTURES_MANAGE);
  const canDevices = can(PERMISSIONS.DEVICES_VIEW) || can(PERMISSIONS.DEVICES_MANAGE);

  const [today] = useState(() => academyToday());
  const day = useMoneySummary({ from: today, to: today }, { enabled: canMoney, refetchInterval: POLL });
  const month = useMoneySummary({ from: `${today.slice(0, 7)}-01`, to: today }, { enabled: canMoney, refetchInterval: POLL });
  const board = useBoard(undefined, { enabled: canAttendance });
  const pending = useLeaveList({ status: "pending" }, { enabled: canAttendance });
  const reach = useAlertReach(canAlerts);
  const lectureToday = useLectureList({ date: today }, { enabled: canLectures });
  const devices = useDevices({ enabled: canDevices });

  const go = (name: string) => () => nav.navigate(name);
  const tiles: TileSpec[] = [];

  if (canMoney) {
    const d = day.data;
    const m = month.data;
    const cheques = m?.openCheques;
    const openFees = canFees ? go("Fees") : undefined;
    const openExpenses = canExpenses ? go("Expenses") : undefined;
    tiles.push(
      {
        key: "collected",
        label: "Collected today",
        value: formatPaise(d?.collected),
        sublabel: d ? `${d.receipts} receipt${d.receipts === 1 ? "" : "s"}${d.refunded ? ` · ${formatPaise(d.refunded)} refunded` : ""}` : undefined,
        icon: IndianRupee,
        onPress: openFees,
        testID: "money-collected-today",
        empty: isEmptyFigure(d?.collected, Boolean(d)),
      },
      {
        key: "spent",
        label: "Spent today",
        value: formatPaise(d?.spent),
        icon: Receipt,
        onPress: openExpenses,
        testID: "money-spent-today",
        empty: isEmptyFigure(d?.spent, Boolean(d)),
      },
      {
        key: "net",
        label: "This month: net",
        value: formatPaise(m?.net),
        sublabel: m ? `In ${formatPaise(m.collected)} · out ${formatPaise(m.spent)}` : undefined,
        icon: Scale,
        attention: m ? m.net < 0 : false,
        onPress: openFees ?? openExpenses,
        testID: "money-month-net",
        empty: isEmptyFigure(m?.net, Boolean(m)),
      },
      {
        key: "cheques",
        label: "Cheques to clear",
        value: cheques ? cheques.count : "—",
        sublabel: cheques ? `${formatPaise(cheques.amount)} received this month` : undefined,
        icon: FileClock,
        attention: (cheques?.count ?? 0) > 0,
        onPress: openFees,
        testID: "money-cheques",
        empty: isEmptyFigure(cheques?.count, Boolean(cheques)),
      },
    );
  }

  if (canAttendance) {
    const meeting = (board.data?.batches ?? []).filter((b) => b.meetsToday);
    const sum = (k: "present" | "late" | "absent") => meeting.reduce((n, b) => n + (b.counts[k] ?? 0), 0);
    const notYet = meeting.reduce((n, b) => n + b.notYet, 0);
    const loaded = Boolean(board.data);
    const open = go("Today");
    tiles.push(
      { key: "present", label: "In class today", value: sum("present"), icon: UserCheck, onPress: open, testID: "tile-present", empty: isEmptyFigure(sum("present"), loaded) },
      { key: "late", label: "Late", value: sum("late"), icon: Timer, onPress: open, empty: isEmptyFigure(sum("late"), loaded) },
      { key: "absent", label: "Absent", value: sum("absent"), icon: UserX, attention: sum("absent") > 0, onPress: open, empty: isEmptyFigure(sum("absent"), loaded) },
      { key: "notyet", label: "Not in yet", value: notYet, icon: Hourglass, onPress: open, empty: isEmptyFigure(notYet, loaded) },
    );
    const waiting = (pending.data ?? []).filter((l) => l.source === "parent").length;
    tiles.push({
      key: "leaves",
      label: "Leave to decide",
      value: waiting,
      icon: CalendarCheck,
      attention: waiting > 0,
      onPress: go("Leaves"),
      testID: "tile-leaves",
      empty: isEmptyFigure(waiting, Boolean(pending.data)),
    });
  }

  if (canAlerts) {
    const a = reach.data?.adoption;
    if (a) {
      tiles.push({
        key: "notified",
        label: "Parents notified",
        value: `${a.notified}/${a.eligible}`,
        sublabel: a.awaiting > 0 ? `${a.awaiting} more awaiting confirmation` : "Received an app notification",
        icon: BellRing,
        onPress: go("Alerts"),
        testID: "tile-reach",
        empty: isEmptyFigure(a.notified),
      });
    }
  }

  if (canLectures) {
    const list = (lectureToday.data ?? []).filter((l) => l.status === "scheduled");
    const toConfirm = list.filter((l) => l.state === "overdue").length;
    const noTeacher = list.filter((l) => !l.teacherId).length;
    const loaded = Boolean(lectureToday.data);
    const open = go("Lectures");
    tiles.push(
      { key: "lectures", label: "Lectures today", value: list.length, icon: BookOpen, onPress: open, testID: "tile-lectures", empty: isEmptyFigure(list.length, loaded) },
      { key: "confirm", label: "To confirm", value: toConfirm, icon: AlertTriangle, attention: toConfirm > 0, onPress: open, empty: isEmptyFigure(toConfirm, loaded) },
      { key: "noteacher", label: "No teacher set", value: noTeacher, attention: noTeacher > 0, onPress: open, empty: isEmptyFigure(noTeacher, loaded) },
    );
  }

  let machineOffline = false;
  if (canDevices) {
    const list = devices.data ?? [];
    const approved = list.filter((d) => d.status === "approved");
    const online = approved.filter((d) => d.online).length;
    const waitingApproval = list.filter((d) => d.status === "pending").length;
    const lastPunch = approved
      .map((d) => d.lastPunchAt)
      .filter(Boolean)
      .sort()
      .pop();
    const loaded = Boolean(devices.data);
    const open = go("Devices");
    machineOffline = approved.length > 0 && online < approved.length;
    tiles.push(
      { key: "online", label: "Machines online", value: `${online}/${approved.length}`, icon: Wifi, attention: online < approved.length, onPress: open, empty: isEmptyFigure(online, loaded) },
      { key: "approval", label: "Waiting for approval", value: waitingApproval, icon: ShieldAlert, attention: waitingApproval > 0, onPress: open, empty: isEmptyFigure(waitingApproval, loaded) },
      // no punch yet is an empty card too
      { key: "lastpunch", label: "Last punch", value: lastPunch ? formatRelative(lastPunch) : "none yet", icon: Clock, onPress: open, empty: loaded && !lastPunch },
      { key: "machines", label: "Machines", value: list.length, icon: Fingerprint, onPress: open, empty: isEmptyFigure(list.length, loaded) },
    );
  }

  return {
    tiles,
    machineOffline,
    moneyError: Boolean(day.error || month.error),
    hasAny: canDevices || canAttendance || canMoney,
  };
}
