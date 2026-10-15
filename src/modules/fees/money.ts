import { parseRupees } from "@shared/format";

/**
 * Small money helpers for the fee forms. Amounts are whole paise and only
 * integer arithmetic is used, so a split or a total is exact to the paisa.
 */

/** Whole paise → what goes back into a rupee field: 1250050 → "12500.50", 1250000 → "12500". */
export function paiseToInput(paise: number) {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  return p ? `${rupees}.${String(p).padStart(2, "0")}` : String(rupees);
}

export const sumPaise = (rows: { amount: number }[]) => rows.reduce((n, r) => n + r.amount, 0);

/** The server's splitEvenly: `n` equal parts, the paise that do not divide go on the first. */
export function splitEvenly(total: number, n: number) {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? total - base * n : 0));
}

export const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

/** "2026-06-15" plus `n` months, the day kept (capped at 28 so it always exists). */
export function addMonthsTo(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}-${String(Math.min(d, 28)).padStart(2, "0")}`;
}

/**
 * A rupee field read for saving: empty counts as `emptyAs` (null means it is
 * required), anything not an amount is an error.
 */
export function readRupees(text: string, emptyAs: number | null = null): { paise: number | null; error?: string } {
  if (!text.trim()) return emptyAs === null ? { paise: null, error: "Enter the amount" } : { paise: emptyAs };
  const paise = parseRupees(text);
  return paise === null ? { paise: null, error: "Enter rupees, like 12500 or 12,500.50" } : { paise };
}
