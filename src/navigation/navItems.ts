import {
  LayoutDashboard,
  Fingerprint,
  UserCog,
  ScrollText,
  UserRound,
  GraduationCap,
  Users,
  UsersRound,
  CalendarOff,
  Settings,
  Activity,
  ClipboardCheck,
  ListChecks,
  CalendarCheck,
  BellRing,
  Bell,
  BookOpen,
  Wallet,
  Presentation,
  FileCheck2,
  Megaphone,
  FileText,
  MessageCircleQuestion,
  BarChart3,
  PhoneCall,
  IndianRupee,
  Receipt,
  type LucideIcon,
} from "lucide-react-native";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";

export type NavSection = "Dashboard" | "Academy" | "Attendance" | "Communication" | "Money" | "Administration" | "Workspace";

export const SECTION_ORDER: NavSection[] = ["Dashboard", "Academy", "Attendance", "Communication", "Money", "Administration", "Workspace"];

export const SECTION_ICON: Record<NavSection, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Academy: GraduationCap,
  Attendance: Fingerprint,
  Communication: Megaphone,
  Money: IndianRupee,
  Administration: Settings,
  Workspace: UserRound,
};

/** A sidebar dropdown that holds other sections, each still its own dropdown. */
export type NavFolder = "Settings";

/** Sections shown inside a folder rather than at the top of the sidebar. */
export const SECTION_FOLDER: Partial<Record<NavSection, NavFolder>> = {
  Communication: "Settings",
  Money: "Settings",
  Administration: "Settings",
  Workspace: "Settings",
};

export const FOLDER_ICON: Record<NavFolder, LucideIcon> = { Settings: Settings };

/** The sidebar's top level, in order: plain sections, then folders where their first section was. */
export const TOP_LEVEL: (NavSection | NavFolder)[] = [];
for (const section of SECTION_ORDER) {
  const entry = SECTION_FOLDER[section] ?? section;
  if (!TOP_LEVEL.includes(entry)) TOP_LEVEL.push(entry);
}

export interface NavItem {
  /** route name; must match a key in AppNavigator's SCREENS and the linking table */
  name: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
  /** visible when the user holds any of these; none = everyone signed in */
  permissionAny?: string[];
  /** only for a login linked to a faculty member */
  teacherOnly?: boolean;
  /**
   * Opened from a tab on that page, so the sidebar shows that page's row
   * instead (highlighted while this one is open). Kept as its own row for
   * someone who may open this but not that.
   */
  sidebarAs?: string;
}

/** Sections with no dropdown: their pages are plain links at the top of the sidebar. */
export const FLAT_SECTIONS: NavSection[] = ["Dashboard"];

/**
 * Drives both the sidebar and route registration: a route the person cannot
 * use is never registered, so a deep link to it cannot render. The server
 * enforces the same permissions separately. Phases add their screens here.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Dashboard",
    permissionAny: [PERMISSIONS.DASHBOARD_VIEW],
  },
  {
    name: "Reports",
    label: "Reports",
    icon: BarChart3,
    section: "Dashboard",
    // a tab on the Dashboard page
    sidebarAs: "Dashboard",
    permissionAny: [
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.PAYROLL_VIEW,
      PERMISSIONS.PAYROLL_MANAGE,
      PERMISSIONS.ENQUIRIES_MANAGE,
      PERMISSIONS.FEES_VIEW,
      PERMISSIONS.FEES_COLLECT,
      PERMISSIONS.FEES_MANAGE,
      PERMISSIONS.EXPENSES_MANAGE,
    ],
  },
  {
    name: "Enquiries",
    label: "Enquiries",
    icon: PhoneCall,
    section: "Academy",
    permissionAny: [PERMISSIONS.ENQUIRIES_MANAGE],
  },
  {
    name: "Students",
    label: "Students",
    icon: GraduationCap,
    section: "Academy",
    permissionAny: [PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STUDENTS_MANAGE],
  },
  {
    name: "Batches",
    label: "Batches",
    icon: Users,
    section: "Academy",
    permissionAny: [PERMISSIONS.BATCHES_VIEW, PERMISSIONS.BATCHES_MANAGE],
  },
  {
    name: "Faculty",
    label: "Faculty",
    icon: UsersRound,
    section: "Academy",
    permissionAny: [PERMISSIONS.TEACHERS_VIEW, PERMISSIONS.TEACHERS_MANAGE],
  },
  {
    name: "Lectures",
    label: "Lectures",
    icon: BookOpen,
    section: "Academy",
    permissionAny: [PERMISSIONS.LECTURES_VIEW, PERMISSIONS.LECTURES_MANAGE],
  },
  {
    name: "Exams",
    label: "Tests",
    icon: FileCheck2,
    section: "Academy",
    permissionAny: [PERMISSIONS.EXAMS_VIEW, PERMISSIONS.EXAMS_MARKS, PERMISSIONS.EXAMS_PUBLISH],
  },
  {
    name: "Holidays",
    label: "Holidays",
    icon: CalendarOff,
    section: "Academy",
    permissionAny: [PERMISSIONS.BATCHES_VIEW, PERMISSIONS.BATCHES_MANAGE, PERMISSIONS.ATTENDANCE_VIEW],
  },
  {
    name: "Today",
    label: "Today",
    icon: Activity,
    section: "Attendance",
    permissionAny: [PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MANAGE],
  },
  {
    name: "Registers",
    label: "Registers",
    icon: ClipboardCheck,
    section: "Attendance",
    permissionAny: [PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MANAGE],
  },
  {
    name: "Punches",
    label: "Punches",
    icon: ListChecks,
    section: "Attendance",
    permissionAny: [PERMISSIONS.PUNCHES_VIEW, PERMISSIONS.ATTENDANCE_MANAGE],
  },
  {
    name: "Leaves",
    label: "Leave requests",
    icon: CalendarCheck,
    section: "Attendance",
    permissionAny: [PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MANAGE],
  },
  {
    name: "Alerts",
    label: "Parent alerts",
    icon: BellRing,
    section: "Attendance",
    permissionAny: [PERMISSIONS.ATTENDANCE_MANAGE, PERMISSIONS.MESSAGES_BROADCAST],
  },
  {
    name: "Devices",
    label: "Fingerprint machines",
    icon: Fingerprint,
    section: "Attendance",
    permissionAny: [PERMISSIONS.DEVICES_VIEW, PERMISSIONS.DEVICES_MANAGE],
  },
  // every member of staff reads the board and the shared documents, and can raise an issue
  { name: "Notices", label: "Notice board", icon: Megaphone, section: "Communication" },
  { name: "Documents", label: "Documents", icon: FileText, section: "Communication" },
  { name: "Issues", label: "Issues", icon: MessageCircleQuestion, section: "Communication" },
  {
    name: "Fees",
    label: "Fees",
    icon: IndianRupee,
    section: "Money",
    permissionAny: [PERMISSIONS.FEES_VIEW, PERMISSIONS.FEES_COLLECT, PERMISSIONS.FEES_MANAGE],
  },
  { name: "Expenses", label: "Expenses", icon: Receipt, section: "Money", permissionAny: [PERMISSIONS.EXPENSES_MANAGE] },
  {
    name: "Users",
    label: "Staff logins",
    icon: UserCog,
    section: "Administration",
    permissionAny: [PERMISSIONS.USERS_MANAGE],
  },
  {
    name: "Salary",
    label: "Faculty salary",
    icon: Wallet,
    section: "Administration",
    permissionAny: [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_MANAGE],
  },
  {
    name: "Settings",
    label: "Settings",
    icon: Settings,
    section: "Administration",
    permissionAny: [PERMISSIONS.SETTINGS_MANAGE],
  },
  {
    name: "Audit",
    label: "Audit trail",
    icon: ScrollText,
    section: "Administration",
    permissionAny: [PERMISSIONS.AUDIT_VIEW],
  },
  { name: "MyTeaching", label: "My teaching", icon: Presentation, section: "Workspace", teacherOnly: true },
  { name: "Inbox", label: "Notifications", icon: Bell, section: "Workspace" },
  { name: "Profile", label: "My account", icon: UserRound, section: "Workspace" },
];

/** Pure, for tests: which items a permission list unlocks. */
export function visibleItemsFor(permissions: string[], { isTeacher = false } = {}): NavItem[] {
  return NAV_ITEMS.filter(
    (it) => (!it.teacherOnly || isTeacher) && (!it.permissionAny || it.permissionAny.some((p) => permissions.includes(p))),
  );
}

export function useVisibleNavItems(): NavItem[] {
  // a primitive (joined string) selector: zustand v5 compares with Object.is,
  // and a fresh array each render would re-render forever
  const joined = useAuthStore((s) => (s.staff?.permissions ?? []).join(","));
  const isTeacher = useAuthStore((s) => Boolean(s.staff?.teacherId));
  return visibleItemsFor(joined ? joined.split(",") : [], { isTeacher });
}
