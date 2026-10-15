export type LectureState = "upcoming" | "ongoing" | "conducted" | "not_conducted" | "overdue" | "cancelled";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Lecture {
  id: string;
  batchId: string;
  batchName?: string;
  date: string;
  startTime: string;
  endTime: string;
  minutes?: number;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  topics: string;
  note: string;
  status: "scheduled" | "cancelled";
  state?: LectureState;
  conducted: boolean | null;
  teacherPresence: { present: boolean; lateMinutes: number | null; leftEarlyMinutes: number | null } | null;
  cancelReason: string;
  markedAt: string | null;
  counts?: { present?: number; absent?: number };
}

export interface LectureInput {
  batchId: string;
  date: string;
  startTime: string;
  endTime: string;
  subject?: string;
  teacherId?: string;
  topics?: string;
  note?: string;
}

export interface LecturePatch {
  startTime?: string;
  endTime?: string;
  subject?: string;
  teacherId?: string | null;
  topics?: string;
  note?: string;
  conducted?: boolean | null;
}

export interface PlanSlot {
  weekdays: Weekday[];
  startTime: string;
  endTime: string;
  subject?: string;
  teacherId?: string;
}

export interface PlanResult {
  created: Lecture[];
  skipped: { date: string; startTime: string; endTime: string; reason: "holiday" | "already scheduled" | "teacher busy" }[];
}

export interface CalendarDay {
  date: string;
  scheduled: number;
  cancelled: number;
}

export const STATE_LABELS: Record<LectureState, string> = {
  upcoming: "upcoming",
  ongoing: "ongoing",
  conducted: "conducted",
  not_conducted: "not conducted",
  overdue: "to confirm",
  cancelled: "cancelled",
};
