export type ReportCell = string | number | boolean | null | undefined;
export type ReportRow = Record<string, ReportCell>;

export interface ReportColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

/**
 * The one shape every report comes back in, so a single table, CSV and
 * print path serves them all without knowing which report it is.
 */
export interface Report {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: Record<string, ReportCell>;
  /** only on ID cards: the batch printed on each card */
  batch?: { name: string; startTime: string; endTime: string };
}

export type ReportKey =
  | "admissions"
  | "attendance"
  | "performance"
  | "topics"
  | "biometric"
  | "salary"
  | "idcards"
  | "funnel"
  | "sources"
  | "counselors"
  | "collection"
  | "outstanding"
  | "expenses";

/** Reports about enquiries: for whoever handles enquiries (a counselor sees their own leads only). */
export const ENQUIRY_REPORTS: ReportKey[] = ["funnel", "sources", "counselors"];

/** Reports about fees: for whoever may see, collect or manage fees. */
export const FEE_REPORTS: ReportKey[] = ["collection", "outstanding"];

/** Reports about spending: for whoever handles expenses. */
export const EXPENSE_REPORTS: ReportKey[] = ["expenses"];
export type PunchPersonType = "student" | "teacher" | "unknown";

export interface ReportParams {
  from?: string;
  to?: string;
  batchId?: string;
  standardId?: string;
  personType?: PunchPersonType;
  biometricId?: string;
  /** "YYYY-MM", faculty salary only */
  month?: string;
}

export interface ReportRun {
  key: ReportKey;
  params: ReportParams;
}

export interface ReportChoice {
  key: ReportKey;
  label: string;
  description: string;
  /** which filters the report takes; `anyBatch` is a batch filter that may be left at "All batches" */
  needs: { batch?: boolean; anyBatch?: boolean; range?: boolean; standard?: boolean; month?: boolean; punches?: boolean };
}

export const REPORT_CHOICES: ReportChoice[] = [
  { key: "admissions", label: "Admissions", description: "Students admitted in a period, with the parent's login.", needs: { range: true, standard: true } },
  { key: "attendance", label: "Batch attendance", description: "Each student's days and percentage.", needs: { batch: true, range: true } },
  { key: "performance", label: "Batch performance", description: "Every published test, one column each.", needs: { batch: true, range: true } },
  { key: "topics", label: "Lectures & topics", description: "What was taught, and by whom (up to two months).", needs: { batch: true, range: true } },
  { key: "biometric", label: "Biometric punches", description: "Every punch, by person or ID (up to a month).", needs: { range: true, punches: true } },
  { key: "salary", label: "Faculty salary", description: "A month's pay, from the lectures taken.", needs: { month: true } },
  { key: "idcards", label: "ID cards", description: "Printable cards for a batch, eight to a page.", needs: { batch: true } },
  { key: "funnel", label: "Enquiry funnel", description: "Leads by stage, conversion, and why leads did not join.", needs: { range: true } },
  { key: "sources", label: "Enquiry sources", description: "Which sources bring leads, and which of them join.", needs: { range: true } },
  { key: "counselors", label: "Enquiries by counselor", description: "Each person's leads and conversions.", needs: { range: true } },
  {
    key: "collection",
    label: "Fee collection",
    description: "The day book: every receipt in a period, with totals by mode. Cancelled and bounced are listed, not counted.",
    needs: { range: true },
  },
  { key: "outstanding", label: "Outstanding fees", description: "Who still owes, how much is overdue, and what falls due next.", needs: { anyBatch: true } },
  { key: "expenses", label: "Expenses", description: "Every voucher in a period, with totals by category.", needs: { range: true } },
];

/** A fee receipt as GET /fees/receipts sends it (toReceiptDto). Amounts are whole paise. */
export interface FeeReceiptRow {
  id: string;
  number: string;
  date: string;
  amount: number;
  mode: "cash" | "upi" | "card" | "cheque" | "bank_transfer";
  reference: string;
  student?: { name: string; grNumber: string };
  cheque: { number: string; bank: string; date: string | null; status: "pending" | "deposited" | "cleared" | "bounced" | null } | null;
  cancelled: boolean;
  cancelReason: string;
}

/** One student who still owes, as GET /fees/outstanding sends it. Amounts are whole paise. */
export interface OutstandingRow {
  studentId: string;
  name: string;
  grNumber: string;
  batchName: string;
  phone: string;
  net: number;
  paid: number;
  balance: number;
  overdue: number;
  nextDue: { label: string; dueDate: string; amount: number } | null;
}
