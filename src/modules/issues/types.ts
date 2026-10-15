export type IssueCategory = "academic" | "attendance" | "fees" | "facility" | "app" | "staff" | "other";
export type IssuePriority = "low" | "normal" | "high" | "urgent";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface IssueComment {
  id: string;
  by: { type: "staff" | "parent"; name: string };
  body: string;
  /** a staff note the family never sees */
  internal: boolean;
  at: string;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  raisedBy: { type: "staff" | "parent"; name: string };
  student: { id: string; name: string; grNumber: string } | null;
  studentId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueOn: string | null;
  resolvedAt: string | null;
  comments: IssueComment[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueAssignee {
  id: string;
  name: string;
  role: string;
}

export interface IssueFilter {
  /** "active" is open and in progress together */
  status?: IssueStatus | "active";
  assigneeId?: string;
  category?: IssueCategory;
  mine?: boolean;
}

export interface IssueInput {
  title: string;
  description?: string;
  category?: IssueCategory;
  priority?: IssuePriority;
  studentId?: string;
}

export interface IssuePatch {
  status?: IssueStatus;
  priority?: IssuePriority;
  category?: IssueCategory;
  assigneeId?: string | null;
  dueOn?: string | null;
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  academic: "Academic",
  attendance: "Attendance",
  fees: "Fees",
  facility: "Facility",
  app: "App",
  staff: "Staff",
  other: "Other",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const options = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((k) => ({ value: k, label: labels[k] }));

export const CATEGORY_OPTIONS = options(CATEGORY_LABELS);
export const PRIORITY_OPTIONS = options(PRIORITY_LABELS);
export const STATUS_OPTIONS = options(STATUS_LABELS);
