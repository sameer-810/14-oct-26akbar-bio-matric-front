import { apiClient } from "@api/apiClient";
import { academyToday, formatDay, formatMonth, formatPaise, formatRupees } from "@shared/format";
import { payrollApi } from "@modules/payroll/api/payrollApi";
import { PAY_KIND_LABELS, type PayrollRow } from "@modules/payroll/types";
import { expensesApi } from "@modules/expenses/api/expensesApi";
import { MODE_LABELS, PAYMENT_MODES, type Expense, type PaymentMode } from "@modules/expenses/types";
import type { FeeReceiptRow, OutstandingRow, Report, ReportKey, ReportParams } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** Reports the server builds in the generic shape; the rest are mapped here from their own APIs. */
type ServerReport = Exclude<ReportKey, "salary" | "collection" | "outstanding" | "expenses">;

const PATHS: Record<ServerReport, string> = {
  admissions: "/reports/admissions",
  attendance: "/reports/batch-attendance",
  performance: "/reports/batch-performance",
  topics: "/reports/topics",
  biometric: "/reports/biometric",
  idcards: "/reports/id-cards",
  funnel: "/enquiries/reports/funnel",
  sources: "/enquiries/reports/sources",
  counselors: "/enquiries/reports/counselors",
};

/** Drop the empty filters; the server rejects an empty batchId rather than ignoring it. */
const clean = (p: ReportParams) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ""));

/** Faculty salary lives under /payroll in its own shape; turn it into a report like the others. */
export function payrollToReport(month: string, rows: PayrollRow[]): Report {
  return {
    title: "Faculty salary",
    subtitle: formatMonth(month),
    columns: [
      { key: "name", label: "Teacher" },
      { key: "biometricId", label: "Fingerprint ID" },
      { key: "rate", label: "Rate" },
      { key: "conducted", label: "Lectures taken", numeric: true },
      { key: "toConfirm", label: "To confirm", numeric: true },
      { key: "cancelled", label: "Cancelled", numeric: true },
      { key: "hours", label: "Lecture hours", numeric: true },
      { key: "days", label: "Days in", numeric: true },
      { key: "amount", label: "Amount (₹)", numeric: true },
    ],
    rows: rows.map((r) => ({
      name: r.isActive ? r.name : `${r.name} (left)`,
      biometricId: r.biometricId,
      rate: r.rate ? `${PAY_KIND_LABELS[r.rate.kind]} · ${formatRupees(r.rate.rate)}` : "No rate",
      conducted: r.counts.conducted,
      toConfirm: r.counts.toConfirm,
      cancelled: r.counts.cancelled,
      hours: Math.round((r.lectureMinutes / 60) * 10) / 10,
      days: r.daysAtAcademy,
      amount: Math.round(r.amount),
    })),
    totals: {
      teachers: rows.length,
      amount: Math.round(rows.reduce((n, r) => n + r.amount, 0)),
      toConfirm: rows.reduce((n, r) => n + r.counts.toConfirm, 0),
      unpriced: rows.filter((r) => r.unpriced).length,
    },
  };
}

/**
 * Whole paise as a rupee figure for a spreadsheet, always two decimals:
 * 123450 → "1234.50". Done on the integer, so no floating point can move a
 * paisa; Excel reads the text as a number.
 */
export function rupeesCell(paise: number): string {
  const a = Math.abs(paise);
  return `${paise < 0 ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}

const rangeText = (from: string, to: string) => (from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`);

/** The server's own caps on a list; reaching one means the totals are short. */
const RECEIPT_LIMIT = 5000;
const EXPENSE_LIMIT = 2000;

/** The server's rule: a cancelled receipt or a bounced cheque brings in nothing. */
const receiptCounts = (r: FeeReceiptRow) => !r.cancelled && !(r.mode === "cheque" && r.cheque?.status === "bounced");

const CHEQUE_STATUS: Record<string, string> = {
  pending: "Cheque not yet deposited",
  deposited: "Cheque deposited",
  cleared: "Cheque cleared",
  bounced: "Bounced — not counted",
};

function receiptStatus(r: FeeReceiptRow) {
  if (r.cancelled) return `Cancelled — ${r.cancelReason || "no reason given"}`;
  if (r.mode === "cheque") return CHEQUE_STATUS[r.cheque?.status ?? ""] ?? "Cheque";
  return "Received";
}

function receiptReference(r: FeeReceiptRow) {
  if (r.mode !== "cheque" || !r.cheque) return r.reference;
  const c = r.cheque;
  return [c.number && `No. ${c.number}`, c.bank, c.date && formatDay(c.date)].filter(Boolean).join(" · ");
}

/** Mode totals keyed for the totals line ("bank_transfer" reads as "bankTransfer"). */
const MODE_TOTAL_KEY: Record<PaymentMode, string> = { cash: "cash", upi: "upi", card: "card", cheque: "cheque", bank_transfer: "bankTransfer" };

/**
 * The fee day book (GET /fees/receipts) as a report. Every receipt is listed,
 * cancelled and bounced included so the numbering has no gaps, but only
 * those that bring in money are added up — the same rule as the server.
 */
export function receiptsToReport(from: string, to: string, receipts: FeeReceiptRow[]): Report {
  const counted = receipts.filter(receiptCounts);
  const byMode = new Map<PaymentMode, number>();
  for (const r of counted) byMode.set(r.mode, (byMode.get(r.mode) ?? 0) + r.amount);
  const modeTotals: Record<string, string> = {};
  for (const m of PAYMENT_MODES) {
    const n = byMode.get(m) ?? 0;
    if (n) modeTotals[MODE_TOTAL_KEY[m]] = formatPaise(n);
  }
  const notCounted = receipts.length - counted.length;
  return {
    title: "Fee collection",
    subtitle: rangeText(from, to),
    columns: [
      { key: "date", label: "Date" },
      { key: "number", label: "Receipt" },
      { key: "name", label: "Student" },
      { key: "grNumber", label: "GR" },
      { key: "mode", label: "Mode" },
      { key: "reference", label: "Reference / cheque" },
      { key: "amount", label: "Amount (₹)", numeric: true },
      { key: "status", label: "Status" },
    ],
    rows: receipts.map((r) => ({
      date: r.date,
      number: r.number,
      name: r.student?.name ?? "",
      grNumber: r.student?.grNumber ?? "",
      mode: MODE_LABELS[r.mode] ?? r.mode,
      reference: receiptReference(r),
      amount: rupeesCell(r.amount),
      status: receiptStatus(r),
    })),
    totals: {
      receipts: counted.length,
      counted: formatPaise(counted.reduce((n, r) => n + r.amount, 0)),
      ...modeTotals,
      notCounted: notCounted || undefined,
      note: receipts.length >= RECEIPT_LIMIT ? `Only the first ${RECEIPT_LIMIT.toLocaleString("en-IN")} receipts — narrow the range` : undefined,
    },
  };
}

/** Who still owes (GET /fees/outstanding), most overdue first as the server sorts it. */
export function outstandingToReport(rows: OutstandingRow[], batchId?: string): Report {
  const batch = batchId ? (rows[0]?.batchName ?? "The chosen batch") : "All batches";
  return {
    title: "Outstanding fees",
    subtitle: `${batch} · as of ${formatDay(academyToday())}`,
    columns: [
      { key: "name", label: "Student" },
      { key: "grNumber", label: "GR" },
      { key: "batchName", label: "Batch" },
      { key: "phone", label: "Phone" },
      { key: "net", label: "Fee (₹)", numeric: true },
      { key: "paid", label: "Paid (₹)", numeric: true },
      { key: "balance", label: "Balance (₹)", numeric: true },
      { key: "overdue", label: "Overdue (₹)", numeric: true },
      { key: "nextDue", label: "Next due" },
    ],
    rows: rows.map((r) => ({
      name: r.name,
      grNumber: r.grNumber,
      batchName: r.batchName,
      phone: r.phone,
      net: rupeesCell(r.net),
      paid: rupeesCell(r.paid),
      balance: rupeesCell(r.balance),
      overdue: rupeesCell(r.overdue),
      nextDue: r.nextDue ? `${r.nextDue.label}, ${formatDay(r.nextDue.dueDate)}: ${formatPaise(r.nextDue.amount)}` : "",
    })),
    totals: {
      students: rows.length,
      balance: formatPaise(rows.reduce((n, r) => n + r.balance, 0)),
      overdue: formatPaise(rows.reduce((n, r) => n + r.overdue, 0)),
      overdueStudents: rows.filter((r) => r.overdue > 0).length,
    },
  };
}

/** Spending in a range (GET /expenses, cancelled left out) as a report, with totals by category. */
export function expensesToReport(from: string, to: string, list: Expense[]): Report {
  const counted = list.filter((e) => !e.cancelled);
  const byCategory = new Map<string, number>();
  for (const e of counted) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    title: "Expenses",
    subtitle: rangeText(from, to),
    columns: [
      { key: "voucher", label: "Voucher" },
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "vendor", label: "Paid to" },
      { key: "description", label: "Description" },
      { key: "mode", label: "Mode" },
      { key: "reference", label: "Reference" },
      { key: "amount", label: "Amount (₹)", numeric: true },
    ],
    // oldest first, like the fee day book
    rows: [...counted]
      .sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher))
      .map((e) => ({
        voucher: e.voucher,
        date: e.date,
        category: e.category,
        vendor: e.vendor,
        description: e.description,
        mode: MODE_LABELS[e.mode] ?? e.mode,
        reference: e.reference,
        amount: rupeesCell(e.amount),
      })),
    totals: {
      expenses: counted.length,
      spent: formatPaise(counted.reduce((n, e) => n + e.amount, 0)),
      byCategory: categories.length ? categories.map(([name, n]) => `${name} ${formatPaise(n)}`).join(", ") : undefined,
      note: list.length >= EXPENSE_LIMIT ? `Only the latest ${EXPENSE_LIMIT.toLocaleString("en-IN")} entries — narrow the range` : undefined,
    },
  };
}

export const reportsApi = Object.freeze({
  run: async (key: ReportKey, params: ReportParams): Promise<Report> => {
    if (key === "salary") {
      const month = params.month ?? "";
      return payrollToReport(month, await payrollApi.report(month));
    }
    const from = params.from ?? "";
    const to = params.to ?? "";
    if (key === "collection") {
      return receiptsToReport(from, to, await data<FeeReceiptRow[]>(apiClient.get("/fees/receipts", { params: { from, to } })));
    }
    if (key === "outstanding") {
      return outstandingToReport(await data<OutstandingRow[]>(apiClient.get("/fees/outstanding", { params: clean({ batchId: params.batchId }) })), params.batchId);
    }
    if (key === "expenses") return expensesToReport(from, to, await expensesApi.list({ from, to }));
    return data<Report>(apiClient.get(PATHS[key], { params: clean({ ...params, month: undefined }) }));
  },
});
