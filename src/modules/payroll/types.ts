import type { Lecture } from "@modules/lectures/types";

export type PayKind = "monthly" | "hourly" | "per_lecture" | "per_subject";

export const PAY_KIND_LABELS: Record<PayKind, string> = {
  monthly: "Fixed per month",
  hourly: "Per hour of lecture",
  per_lecture: "Per lecture",
  per_subject: "Per lecture, by subject",
};

export interface PayRate {
  id: string;
  teacherId: string;
  effectiveFrom: string;
  kind: PayKind;
  rate: number;
  subjectRates: { subject: string; rate: number }[];
  note: string;
}

export interface PayCounts {
  scheduled: number;
  conducted: number;
  cancelled: number;
  notConducted: number;
  toConfirm: number;
  upcoming: number;
}

export interface PayrollRow {
  teacherId: string;
  name: string;
  biometricId: string;
  isActive: boolean;
  rate: { kind: PayKind; rate: number } | null;
  counts: PayCounts;
  lectureMinutes: number;
  daysAtAcademy: number;
  minutesAtAcademy: number;
  amount: number;
  unpriced: boolean;
}

export interface TeacherMonth {
  teacher: { id: string; name: string };
  month: string;
  rate: { kind: PayKind; rate: number; subjectRates: { subject: string; rate: number }[] } | null;
  counts: PayCounts;
  lectureMinutes: number;
  daysAtAcademy: number;
  minutesAtAcademy: number;
  amount: number;
  unpriced: boolean;
  lines: { label?: string; date?: string; subject?: string; minutes?: number; kind?: PayKind | null; amount: number }[];
  lectures: Lecture[];
}
