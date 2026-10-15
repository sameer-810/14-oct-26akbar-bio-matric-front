import type { AdmitResult } from "@modules/students/types";

export type EnquiryStage = "hot" | "warm" | "cold" | "interested" | "in_process" | "joined" | "not_joined";
export type EnquirySource = "online_search" | "banner" | "walk_in" | "word_of_mouth" | "newspaper" | "social_media" | "school_visit" | "other";
export type LossReason = "fees" | "distance" | "timing" | "joined_elsewhere" | "not_interested" | "no_response" | "other";

export interface EnquiryGuardian {
  relation: "father" | "mother" | "guardian";
  name?: string;
  phone?: string;
  email?: string;
}

export interface EnquiryNote {
  id: string;
  byName: string;
  body: string;
  at: string;
}

/** The lead as the board shows it beside a follow-up. */
export interface TaskLead {
  id: string;
  number: number;
  name: string;
  phone: string;
  stage: EnquiryStage;
}

export interface EnquiryTask {
  id: string;
  enquiryId: string;
  title: string;
  dueAt: string;
  assigneeId: string | null;
  assigneeName?: string | null;
  done: boolean;
  doneAt: string | null;
  outcome: string;
  /** only on the board */
  overdue?: boolean;
  lead?: TaskLead | null;
}

export interface Enquiry {
  id: string;
  number: number;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  schoolName: string;
  phone: string;
  guardians: EnquiryGuardian[];
  standardId: string | null;
  standardName: string | null;
  batchId: string | null;
  enquiryDate: string;
  source: EnquirySource;
  sourceNote: string;
  stage: EnquiryStage;
  lossReason: LossReason | "";
  lossNote: string;
  assigneeId: string | null;
  assigneeName: string | null;
  nextFollowUpAt: string | null;
  convertedStudentId: string | null;
  convertedAt: string | null;
  notes: EnquiryNote[];
  /** only on the detail */
  tasks?: EnquiryTask[];
  createdAt: string;
}

export interface EnquiryFilter {
  stage?: EnquiryStage;
  source?: EnquirySource;
  assigneeId?: string;
  search?: string;
  from?: string;
  to?: string;
  /** every stage still being worked: hot to in process */
  open?: boolean;
}

/** `dueAt` is an instant with its offset, e.g. "2026-10-16T10:00:00+05:30". */
export interface FollowUpInput {
  title: string;
  dueAt: string;
  assigneeId?: string;
}

export interface EnquiryInput {
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: "male" | "female" | "other" | "";
  dateOfBirth?: string | null;
  schoolName?: string;
  phone?: string;
  guardians?: EnquiryGuardian[];
  standardId?: string | null;
  enquiryDate?: string;
  source?: EnquirySource;
  sourceNote?: string;
  stage?: EnquiryStage;
  assigneeId?: string;
  followUp?: FollowUpInput;
}

export interface EnquiryPatch {
  stage?: EnquiryStage;
  lossReason?: LossReason | "";
  lossNote?: string;
  assigneeId?: string | null;
  standardId?: string | null;
}

export interface TaskPatch {
  title?: string;
  dueAt?: string;
  assigneeId?: string;
  done?: boolean;
  outcome?: string;
}

export interface FollowUpBoard {
  /** the Monday the week starts on */
  week: string;
  overdue: EnquiryTask[];
  days: { date: string; tasks: EnquiryTask[] }[];
}

export interface EnquiryAssignee {
  id: string;
  name: string;
  role: string;
}

export interface EnquiryMatches {
  leads: { id: string; number: number; name: string; stage: EnquiryStage; enquiryDate: string }[];
  students: { id: string; name: string; grNumber: string; status: string }[];
}

export interface MessageResult {
  sent: number;
  failed: number;
  noPhone: number;
  skipped: number;
}

export interface ConvertInput {
  standardId?: string;
  batchId: string;
  admissionDate?: string;
  parent?: { mode: "new" } | { mode: "existing"; parentAccountId: string };
}

/** Exactly what an admission returns. */
export type ConvertResult = AdmitResult;

export const STAGE_LABELS: Record<EnquiryStage, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  interested: "Interested",
  in_process: "In process",
  joined: "Joined",
  not_joined: "Not joined",
};

export const SOURCE_LABELS: Record<EnquirySource, string> = {
  online_search: "Online search",
  banner: "Banner",
  walk_in: "Walk-in",
  word_of_mouth: "Word of mouth",
  newspaper: "Newspaper",
  social_media: "Social media",
  school_visit: "School visit",
  other: "Other",
};

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  fees: "Fees",
  distance: "Distance",
  timing: "Timing",
  joined_elsewhere: "Joined elsewhere",
  not_interested: "Not interested",
  no_response: "No response",
  other: "Other",
};

export const OPEN_STAGES: EnquiryStage[] = ["hot", "warm", "cold", "interested", "in_process"];
export const isOpenStage = (s: EnquiryStage) => OPEN_STAGES.includes(s);

const options = <K extends string>(labels: Record<K, string>, keys = Object.keys(labels) as K[]) => keys.map((k) => ({ value: k, label: labels[k] }));

/** Joining happens only through Admit, so "Joined" is never offered as a choice. */
export const STAGE_CHOICES = options(STAGE_LABELS, [...OPEN_STAGES, "not_joined"]);
export const NEW_STAGE_CHOICES = options(STAGE_LABELS, OPEN_STAGES);
export const SOURCE_OPTIONS = options(SOURCE_LABELS);
export const LOSS_REASON_OPTIONS = options(LOSS_REASON_LABELS);

/** The number to call: a guardian's first, else the student's own. */
export const phoneOf = (l: Pick<Enquiry, "guardians" | "phone">) => l.guardians.find((g) => g.phone)?.phone || l.phone || "";
