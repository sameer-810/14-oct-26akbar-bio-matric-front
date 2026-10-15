/**
 * The app's copy of the server's catalogue (14-10-26-akbar-back/src/config/roles.js).
 * The app only uses it to decide what to show; the server enforces it.
 * `permissionParity.test.js` on the server reads this file and fails the build
 * when the two disagree.
 */

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  FRONT_DESK: "front_desk",
  COUNSELOR: "counselor",
  TEACHER: "teacher",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner / Admin",
  manager: "Branch manager",
  front_desk: "Front desk",
  counselor: "Counselor",
  teacher: "Teacher",
};

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  STUDENTS_VIEW: "students.view",
  STUDENTS_MANAGE: "students.manage",
  ENQUIRIES_MANAGE: "enquiries.manage",
  ENQUIRIES_ALL: "enquiries.all",

  BATCHES_VIEW: "batches.view",
  BATCHES_MANAGE: "batches.manage",

  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_MANAGE: "attendance.manage",
  PUNCHES_VIEW: "punches.view",

  LECTURES_VIEW: "lectures.view",
  LECTURES_MANAGE: "lectures.manage",

  EXAMS_VIEW: "exams.view",
  EXAMS_MARKS: "exams.marks",
  EXAMS_PUBLISH: "exams.publish",

  NOTICES_MANAGE: "notices.manage",
  ISSUES_MANAGE: "issues.manage",
  MESSAGES_BROADCAST: "messages.broadcast",

  FEES_VIEW: "fees.view",
  FEES_COLLECT: "fees.collect",
  FEES_MANAGE: "fees.manage",
  EXPENSES_MANAGE: "expenses.manage",

  TEACHERS_VIEW: "teachers.view",
  TEACHERS_MANAGE: "teachers.manage",
  PAYROLL_VIEW: "payroll.view",
  PAYROLL_MANAGE: "payroll.manage",

  REPORTS_VIEW: "reports.view",

  DEVICES_VIEW: "devices.view",
  DEVICES_MANAGE: "devices.manage",

  AUDIT_VIEW: "audit.view",

  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
  DEVICES_DANGEROUS: "devices.dangerous",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Plain-language names for the permission editor. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "See the dashboard",
  "students.view": "See students",
  "students.manage": "Admit and edit students",
  "enquiries.manage": "Handle enquiries and follow-ups",
  "enquiries.all": "See and reassign every enquiry, not only their own",
  "batches.view": "See batches",
  "batches.manage": "Create and edit batches",
  "attendance.view": "See attendance",
  "attendance.manage": "Correct attendance, leave and manual punches",
  "punches.view": "See raw punches",
  "lectures.view": "See lectures",
  "lectures.manage": "Schedule and cancel lectures",
  "exams.view": "See tests",
  "exams.marks": "Enter test marks",
  "exams.publish": "Publish results to parents",
  "notices.manage": "Post notices and share documents",
  "issues.manage": "Handle issues raised by parents and staff",
  "messages.broadcast": "Message every parent at once",
  "fees.view": "See fees",
  "fees.collect": "Collect fees and print receipts",
  "fees.manage": "Fee plans, discounts, refunds, cancelling receipts and bounced cheques",
  "expenses.manage": "Record expenses",
  "teachers.view": "See faculty",
  "teachers.manage": "Add and edit faculty",
  "payroll.view": "See pay rates and salaries",
  "payroll.manage": "Set teachers' pay rates",
  "reports.view": "See reports",
  "devices.view": "See fingerprint machines",
  "devices.manage": "Approve machines and send them commands",
  "audit.view": "See the audit trail",
  "users.manage": "Create logins (owner only)",
  "settings.manage": "Change academy settings (owner only)",
  "devices.dangerous": "Restart or clear a machine (owner only)",
};

export const OWNER_ONLY_PERMISSIONS: Permission[] = [
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.DEVICES_DANGEROUS,
];
