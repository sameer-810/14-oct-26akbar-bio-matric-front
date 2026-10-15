export type ExamStatus = "scheduled" | "published" | "cancelled";

/** The server's examStats(): averages are over those who appeared. */
export interface ExamStats {
  students: number;
  appeared: number;
  absent: number;
  notEntered: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  passed: number;
  passPercent: number | null;
  averagePercent: number | null;
}

export interface Exam {
  id: string;
  name: string;
  subject: string;
  standardId: string;
  batchIds: string[];
  batchNames?: string[];
  date: string;
  startTime: string;
  maxMarks: number;
  passingMarks: number;
  topics: string;
  status: ExamStatus;
  cancelReason: string;
  announcedAt: string | null;
  publishedAt: string | null;
  /** only on the list */
  stats?: ExamStats;
}

export interface SheetRow {
  studentId: string;
  grNumber: string;
  name: string;
  batchName: string;
  marks: number | null;
  absent: boolean;
  remark: string;
  rank: number | null;
  percent: number | null;
}

export interface ExamSheet {
  exam: Exam;
  stats: ExamStats;
  rows: SheetRow[];
  /** families sent their child's result — only on a publish answer */
  told?: number;
}

export interface ExamInput {
  name: string;
  subject?: string;
  standardId: string;
  batchIds: string[];
  date: string;
  startTime?: string;
  maxMarks: number;
  passingMarks?: number;
  topics?: string;
}

export type ExamPatch = Partial<Omit<ExamInput, "standardId">>;

/** One line of PUT /exams/:id/marks. The server rewrites the remark too, so always send it. */
export interface MarkRow {
  studentId: string;
  marks: number | null;
  absent: boolean;
  remark: string;
}

export interface ExamFilter {
  standardId?: string;
  batchId?: string;
  from?: string;
  to?: string;
  status?: ExamStatus;
}

export type ExamWithTold = Exam & { familiesTold: number };

/**
 * What the status chip says. A test still "scheduled" after its day is
 * waiting for its results, which is the thing staff need to see.
 */
export function examChipStatus(e: Pick<Exam, "status" | "date">, today: string) {
  if (e.status === "scheduled") return e.date < today ? "pending" : "upcoming";
  return e.status;
}

/** "12.5" for marks, "—" for nothing. */
export const showMarks = (n: number | null | undefined) => (typeof n === "number" ? String(n) : "—");
