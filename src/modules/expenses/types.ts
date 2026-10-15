/** How money moved: the same five modes as fee receipts (the server's PAYMENT_MODES). */
export type PaymentMode = "cash" | "upi" | "card" | "cheque" | "bank_transfer";

export const PAYMENT_MODES: PaymentMode[] = ["cash", "upi", "card", "cheque", "bank_transfer"];

export const MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
};

/** One day's spending, as the server's toExpenseDto sends it. Amounts are whole paise. */
export interface Expense {
  id: string;
  /** "V/2026-27/0001" */
  voucher: string;
  date: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  cancelled: boolean;
  cancelReason: string;
  createdAt: string;
}

export interface ExpenseInput {
  /** "YYYY-MM-DD"; the server allows today and a few days back */
  date?: string;
  category: string;
  vendor?: string;
  description?: string;
  /** whole paise */
  amount: number;
  mode: PaymentMode;
  reference?: string;
}

export interface ExpenseFilter {
  from: string;
  to: string;
  category?: string;
  includeCancelled?: boolean;
}

/**
 * Money in against money out for a range (GET /fees/summary), all whole paise.
 * `collected` is receipts that count less refunds; `byMode` only lists modes used.
 */
export interface MoneySummary {
  from: string;
  to: string;
  collected: number;
  refunded: number;
  byMode: Partial<Record<PaymentMode, number>>;
  spent: number;
  byCategory: Record<string, number>;
  net: number;
  receipts: number;
  openCheques: { count: number; amount: number };
}
