import type { Counts, DayStatus, Leave } from "@modules/attendance/types";

export type { Counts, DayStatus, Leave };

export interface Child {
  id: string;
  firstName: string;
  name: string;
  grNumber: string;
  photoUrl: string;
  status: string;
  batch: { name: string; startTime: string; endTime: string } | null;
  today: { status: DayStatus; entryAt: string | null; exitAt: string | null; durationMinutes: number | null } | null;
}

export interface ChildToday {
  date: string;
  status: DayStatus | null;
  entryAt: string | null;
  exitAt: string | null;
  durationMinutes: number | null;
  /** null when the owner has hidden punch times from parents */
  punches: string[] | null;
  /** null when the owner has hidden lectures from parents */
  lectures: { startTime: string; endTime: string; subject: string; status: "present" | "absent" | null }[] | null;
}

export interface Period {
  from: string;
  counts: Counts;
  percent: number | null;
}

export interface Overview {
  week: Period;
  month: Period;
  year: Period;
}

export interface ChildDays {
  counts: Counts;
  percent: number | null;
  days: {
    date: string;
    status: DayStatus;
    entryAt: string | null;
    exitAt: string | null;
    /** every IN with its OUT (null while inside) — a break in the day makes two */
    sessions: { inAt: string; outAt: string | null }[];
    durationMinutes: number | null;
  }[];
}

export interface ParentMessage {
  id: string;
  type: "entry" | "exit" | "absent" | "leave" | "notice" | "message" | "exam" | "document" | "issue" | "fee";
  title: string;
  body: string;
  studentId: string | null;
  createdAt: string;
  read: boolean;
}

export interface Inbox {
  items: ParentMessage[];
  total: number;
  unread: number;
  page: number;
  pages: number;
}

export interface ParentAppSettings {
  academy: string;
  branch: string;
  phone: string;
  sections: { punches: boolean; lectures: boolean; leaveApplication: boolean; results: boolean; documents: boolean; issues: boolean; fees: boolean };
}

export interface TestResult {
  examId: string;
  name: string;
  subject: string;
  date: string;
  maxMarks: number;
  passingMarks: number;
  marks: number | null;
  absent: boolean;
  remark: string;
  percent: number | null;
  rank: number | null;
  outOf: number;
  average: number | null;
  highest: number | null;
}

/** Amounts are whole paise. */
export interface FamilyFees {
  summary: {
    net: number;
    paid: number;
    balance: number;
    overdue: number;
    nextDue: { label: string; dueDate: string; amount: number } | null;
    schedule: { label: string; dueDate: string; amount: number; paid: number; due: number; status: "paid" | "part_paid" | "unpaid"; overdue: boolean }[];
  };
  receipts: { id: string; number: string; date: string; amount: number; mode: string; cheque: { status: string } | null }[];
}

export interface FamilyNotice {
  id: string;
  title: string;
  body: string;
  everyone: boolean;
  pinned: boolean;
  expiresOn: string | null;
  createdAt: string;
}

export interface FamilyDocument {
  id: string;
  title: string;
  description: string;
  everyone: boolean;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export type IssueCategory = "academic" | "attendance" | "fees" | "facility" | "app" | "staff" | "other";

export interface FamilyIssue {
  id: string;
  number: number;
  title: string;
  description: string;
  category: IssueCategory;
  status: "open" | "in_progress" | "resolved" | "closed";
  studentId: string | null;
  comments: { id: string; by: { type: "staff" | "parent"; name: string }; body: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ChildLecture {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  topics: string;
  teacher: string;
  cancelled: boolean;
  cancelReason: string;
  status: "present" | "absent" | null;
}

export interface ChildProfile {
  id: string;
  name: string;
  grNumber: string;
  photoUrl: string;
  gender: string;
  dateOfBirth: string | null;
  phone: string;
  email: string;
  schoolName: string;
  address: { line1?: string; landmark?: string; city?: string; state?: string; pincode?: string };
  admissionDate: string;
  batch: { name: string; startTime: string; endTime: string } | null;
  /** extra batches attended besides the home batch, e.g. a maths group */
  otherBatches: string[];
  guardians: { relation: string; name: string; phone: string; email: string }[];
}
