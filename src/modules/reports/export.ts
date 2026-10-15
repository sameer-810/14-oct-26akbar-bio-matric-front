import { escapeHtml } from "@shared/print/printHtml";
import { LOGO_DATA_URI } from "@shared/print/logo";
import { formatDay, formatRupees, formatWallTime } from "@shared/format";
import type { Report, ReportCell } from "./types";

/**
 * Pure helpers that turn any report into a spreadsheet or a printable page.
 * Nothing here touches the screen or the browser, so it can be tested alone.
 */

const TOTAL_LABELS: Record<string, string> = {
  students: "Students",
  percent: "Attendance %",
  below75: "Below 75%",
  tests: "Tests",
  lectures: "Lectures",
  conducted: "Taken",
  withTopics: "With topics",
  punches: "Punches",
  teachers: "Teachers",
  amount: "Total",
  toConfirm: "To confirm",
  unpriced: "No rate set",
  // money reports: these totals arrive already written as ₹
  receipts: "Receipts",
  counted: "Total counted",
  upi: "UPI",
  bankTransfer: "Bank transfer",
  notCounted: "Cancelled or bounced (not counted)",
  balance: "Balance due",
  overdueStudents: "Students overdue",
  spent: "Total spent",
  byCategory: "By category",
};

const TOTAL_FORMAT: Record<string, (v: ReportCell) => string> = {
  amount: (v) => formatRupees(typeof v === "number" ? v : Number(v)),
};

/** How one cell reads anywhere: blanks stay blank, true/false read as Yes/No. */
export function cellText(v: ReportCell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** "Students: 32 · Attendance %: 84 · Below 75%: 3" — booleans only appear when true (e.g. "capped"). */
export function totalsText(report: Report): string {
  const parts: string[] = [];
  for (const [key, v] of Object.entries(report.totals ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (key === "capped") {
      parts.push("Only the first 20,000 punches — narrow the range");
      continue;
    }
    // a warning written in full by the report itself, shown without a label
    if (key === "note") {
      parts.push(cellText(v));
      continue;
    }
    const label = TOTAL_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
    parts.push(`${label}: ${(TOTAL_FORMAT[key] ?? cellText)(v)}`);
  }
  return parts.join(" · ");
}

/**
 * A spreadsheet cell. Quoted when it holds a comma, quote or line break; a
 * text cell that Excel would read as a formula (=, +, -, @) gets a leading
 * apostrophe, so a name typed as "=HYPERLINK(…)" stays a name. Phone numbers
 * like "+91 98…" are left alone.
 */
function csvCell(v: ReportCell): string {
  let s = cellText(v);
  if (typeof v === "string" && /^[=@\t\r]/.test(s)) s = `'${s}`;
  else if (typeof v === "string" && /^[+-]/.test(s) && !/^[+-][\d\s().-]*$/.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 byte-order mark, so Excel opens names and "₹" correctly. */
export function toCsv(report: Report): string {
  const lines = [report.columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of report.rows) lines.push(report.columns.map((c) => csvCell(row[c.key])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** A file name a browser and Windows will both accept. */
export function exportFileName(report: Report, date: string, ext: string) {
  const base = report.title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Report";
  return `${base} ${date}.${ext}`;
}

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0B1220; margin: 0; }
`;

/** A printable A4 page: the academy, the report's title and range, its totals, and the table. */
export function reportHtml(report: Report, academyName: string, printedOn?: string): string {
  const wide = report.columns.length > 8;
  const head = report.columns.map((c) => `<th${c.numeric ? ' class="n"' : ""}>${escapeHtml(c.label)}</th>`).join("");
  const body = report.rows
    .map((r) => `<tr>${report.columns.map((c) => `<td${c.numeric ? ' class="n"' : ""}>${escapeHtml(cellText(r[c.key]))}</td>`).join("")}</tr>`)
    .join("");
  const totals = totalsText(report);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>${BASE_CSS}
  @page { size: A4 ${wide ? "landscape" : "portrait"}; margin: 12mm; }
  body { font-size: 10.5pt; }
  .brand { display: flex; align-items: center; gap: 8pt; margin-bottom: 4pt; }
  .brand img { width: 14mm; height: 14mm; }
  .academy { font-size: 9pt; color: #4A5568; text-transform: uppercase; letter-spacing: 0.04em; }
  h1 { font-size: 15pt; margin: 2pt 0; }
  .sub { color: #4A5568; margin-bottom: 4pt; }
  .totals { font-weight: 600; margin: 6pt 0 8pt; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #CBD2DC; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #EEF1F5; font-size: 9pt; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .foot { margin-top: 8pt; font-size: 8.5pt; color: #6B7280; }
  .empty { padding: 16pt; text-align: center; color: #6B7280; }
</style></head>
<body>
  <div class="brand"><img src="${LOGO_DATA_URI}" alt="" /><div><div class="academy">${escapeHtml(academyName)}</div>
  <h1>${escapeHtml(report.title)}</h1></div></div>
  ${report.subtitle ? `<div class="sub">${escapeHtml(report.subtitle)}</div>` : ""}
  ${totals ? `<div class="totals">${escapeHtml(totals)}</div>` : ""}
  ${
    report.rows.length
      ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      : `<div class="empty">Nothing in this report.</div>`
  }
  ${printedOn ? `<div class="foot">Printed ${escapeHtml(dayText(printedOn))}</div>` : ""}
</body></html>`;
}

const CARDS_PER_PAGE = 8;

/** "2027-03-31" → "31 Mar 2027"; anything else is shown as it came (Intl throws on a bad date). */
const dayText = (v: ReportCell) => {
  const s = cellText(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? formatDay(s) : s;
};

/**
 * ID cards, two across and four down on each A4 sheet: academy, student,
 * GR, batch and its time, fingerprint ID and valid-till date. Cut along
 * the borders.
 */
export function idCardsHtml(report: Report, academyName: string): string {
  const batch = report.batch;
  const batchLine = batch ? `${batch.name}${batch.startTime ? ` · ${formatWallTime(batch.startTime)}–${formatWallTime(batch.endTime)}` : ""}` : "";
  const card = (r: Report["rows"][number]) => `
    <div class="card">
      <div class="academy"><img src="${LOGO_DATA_URI}" alt="" /><span>${escapeHtml(academyName)}</span></div>
      <div class="name">${escapeHtml(cellText(r.name))}</div>
      <table>
        <tr><th>GR</th><td>${escapeHtml(cellText(r.grNumber))}</td></tr>
        <tr><th>Batch</th><td>${escapeHtml(batchLine)}</td></tr>
        <tr><th>Fingerprint ID</th><td>${escapeHtml(cellText(r.biometricId))}</td></tr>
        <tr><th>Valid till</th><td>${escapeHtml(dayText(r.validTill))}</td></tr>
      </table>
    </div>`;
  const pages: string[] = [];
  for (let i = 0; i < report.rows.length; i += CARDS_PER_PAGE) {
    pages.push(`<section class="page">${report.rows.slice(i, i + CARDS_PER_PAGE).map(card).join("")}</section>`);
  }
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>${BASE_CSS}
  @page { size: A4 portrait; margin: 10mm; }
  .page { display: grid; grid-template-columns: repeat(2, 92mm); grid-template-rows: repeat(4, 66mm); gap: 4mm 6mm; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .card { border: 1px solid #0B1220; border-radius: 3mm; padding: 4mm 5mm; overflow: hidden; display: flex; flex-direction: column; gap: 2mm; }
  .academy { display: flex; align-items: center; gap: 2.5mm; font-size: 10pt; font-weight: 700; color: #1E2A78; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid #C3DBF2; padding-bottom: 1.5mm; }
  .academy img { width: 10mm; height: 10mm; }
  .name { font-size: 13pt; font-weight: 700; }
  table { border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; font-weight: 500; color: #4A5568; padding: 0.6mm 3mm 0.6mm 0; white-space: nowrap; vertical-align: top; }
  td { padding: 0.6mm 0; font-weight: 600; }
  .empty { padding: 16pt; text-align: center; color: #6B7280; }
</style></head>
<body>${pages.length ? pages.join("") : `<div class="empty">No students in this batch.</div>`}</body></html>`;
}
