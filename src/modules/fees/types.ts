/**
 * The server's fee shapes (14-10-26-akbar-back/src/modules/fee). Every amount
 * is whole paise (₹1 = 100); rupees exist only on screen and on paper.
 */

export const PAYMENT_MODES = ["cash", "upi", "card", "cheque", "bank_transfer"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type ChequeStatus = "pending" | "deposited" | "cleared" | "bounced";

export const MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
};

/** What the reference field holds for each mode; cash and cheque have none. */
export const REFERENCE_LABELS: Partial<Record<PaymentMode, string>> = {
  upi: "UPI transaction ID",
  card: "Card last 4 digits",
  bank_transfer: "Transfer reference",
};

export const MODE_OPTIONS = PAYMENT_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }));

export interface FeeItem {
  label: string;
  amount: number;
  kind?: "course" | "additional";
}

export interface Instalment {
  label: string;
  dueDate: string;
  amount: number;
}

export interface FeePlan {
  id: string;
  standardId: string;
  academicYearId: string;
  name: string;
  items: FeeItem[];
  minimumFee: number;
  instalments: Instalment[];
  isActive: boolean;
}

export interface PlanInput {
  standardId: string;
  academicYearId: string;
  name: string;
  items: FeeItem[];
  minimumFee: number;
  instalments?: Instalment[];
}

export interface PlanPatch {
  name?: string;
  items?: FeeItem[];
  minimumFee?: number;
  instalments?: Instalment[];
  isActive?: boolean;
}

export type InstalmentStatus = "paid" | "part_paid" | "unpaid";

export interface ScheduleRow extends Instalment {
  paid: number;
  due: number;
  status: InstalmentStatus;
  overdue: boolean;
}

export interface FeeSummary {
  gross: number;
  discount: number;
  net: number;
  received: number;
  refunded: number;
  paid: number;
  balance: number;
  overdue: number;
  nextDue: { label: string; dueDate: string; amount: number } | null;
  pendingCheques: number;
  schedule: ScheduleRow[];
}

export interface Cheque {
  number: string;
  bank: string;
  date: string | null;
  status: ChequeStatus;
  depositedOn: string | null;
  clearedOn: string | null;
  bouncedOn: string | null;
  bounceNote: string;
}

export interface TaxBreakup {
  rateBps: number;
  taxable: number;
  cgst: number;
  sgst: number;
}

export interface Receipt {
  id: string;
  number: string;
  studentId: string;
  student?: { name: string; grNumber: string };
  date: string;
  amount: number;
  amountInWords: string;
  mode: PaymentMode;
  reference: string;
  cheque: Cheque | null;
  tax: TaxBreakup;
  note: string;
  cancelled: boolean;
  cancelReason: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  reason: string;
}

export interface FeeAccount {
  id: string;
  studentId: string;
  academicYearId: string;
  plan: { id: string; name: string; minimumFee: number } | null;
  items: FeeItem[];
  discount: number;
  discountReason: string;
  instalments: Instalment[];
  summary: FeeSummary;
  receipts: Receipt[];
  refunds: Refund[];
}

export interface SetUpInput {
  feePlanId?: string;
  items?: FeeItem[];
  discount?: number;
  discountReason?: string;
  instalments?: Instalment[];
}

export interface RevisePatch {
  items?: FeeItem[];
  discount?: number;
  discountReason?: string;
  instalments?: Instalment[];
}

export interface CollectInput {
  amount: number;
  date?: string;
  mode: PaymentMode;
  reference?: string;
  cheque?: { number: string; bank: string; date?: string };
  note?: string;
}

export interface RefundInput {
  amount: number;
  date?: string;
  mode: PaymentMode;
  reference?: string;
  reason: string;
}

export interface ChequeActionInput {
  action: "deposit" | "clear" | "bounce";
  date?: string;
  note?: string;
}

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
  pendingCheques: number;
}

export interface OutstandingFilter {
  academicYearId?: string;
  standardId?: string;
  batchId?: string;
  overdueOnly?: boolean;
}

export interface ReceiptFilter {
  from: string;
  to: string;
  mode?: PaymentMode;
  chequeStatus?: ChequeStatus;
}

/** Everything a printed receipt needs (GET /fees/receipts/:id). */
export interface PrintableReceipt {
  receipt: Receipt;
  student: { name: string; grNumber: string; standard: string; batch: string; guardian: string };
  academy: { name: string; branch: string; address: string; phone: string; gstin: string; note: string };
  year: string;
  /** the account's balance when the receipt is fetched */
  balanceAfter: number;
}

/** A receipt that adds to the account: not cancelled, not a bounced cheque (the server's `counts`). */
export const receiptCounts = (r: Receipt) => !r.cancelled && !(r.mode === "cheque" && r.cheque?.status === "bounced");

/** "Cheque 123456 · HDFC", "UPI · 4113…", "Cash". */
export function modeText(r: { mode: PaymentMode; reference: string; cheque?: Cheque | null }) {
  if (r.mode === "cheque" && r.cheque) return `Cheque ${r.cheque.number}${r.cheque.bank ? ` · ${r.cheque.bank}` : ""}`;
  return r.reference ? `${MODE_LABELS[r.mode]} · ${r.reference}` : MODE_LABELS[r.mode];
}
