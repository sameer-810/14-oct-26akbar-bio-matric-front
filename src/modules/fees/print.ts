import { escapeHtml } from "@shared/print/printHtml";
import { LOGO_DATA_URI } from "@shared/print/logo";
import { formatDay, formatPaise } from "@shared/format";
import { MODE_LABELS, REFERENCE_LABELS, type PrintableReceipt } from "./types";

/**
 * A fee receipt on an A5 sheet, as a self-contained HTML page. Pure: it only
 * turns the server's printable receipt into markup, and every value from the
 * server is escaped.
 */

const e = (v: string | number | null | undefined) => escapeHtml(String(v ?? ""));

/** 1800 basis points split in two → "9%"; 1250 → "6.25%". A label, not money. */
const halfRate = (rateBps: number) => `${(rateBps / 200).toLocaleString("en-IN", { maximumFractionDigits: 3 })}%`;

const row = (label: string, value: string) => (value ? `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>` : "");

export function receiptHtml(p: PrintableReceipt): string {
  const { receipt: r, student: s, academy: a } = p;
  const contact = [a.address, a.phone ? `Phone ${a.phone}` : ""].filter(Boolean).join(" · ");

  let payment = "";
  if (r.mode === "cheque" && r.cheque) {
    const c = r.cheque;
    payment = [
      row("Mode", "Cheque"),
      row("Cheque no.", c.number),
      row("Bank", c.bank),
      row("Cheque date", c.date ? formatDay(c.date) : ""),
    ].join("");
    payment += `<tr><td colspan="2" class="realise">Subject to realisation of the cheque.</td></tr>`;
    if (c.status === "bounced") {
      payment += `<tr><td colspan="2" class="bounced">Cheque returned by the bank${c.bouncedOn ? ` on ${e(formatDay(c.bouncedOn))}` : ""}${c.bounceNote ? ` — ${e(c.bounceNote)}` : ""}. This receipt does not count.</td></tr>`;
    }
  } else {
    payment = row("Mode", MODE_LABELS[r.mode] ?? r.mode) + row(REFERENCE_LABELS[r.mode] ?? "Reference", r.reference);
  }

  const t = r.tax;
  const gst =
    t && t.rateBps > 0
      ? `<table class="gst">
  <tr><th>Taxable value</th><td class="n">${e(formatPaise(t.taxable))}</td></tr>
  <tr><th>CGST @ ${e(halfRate(t.rateBps))}</th><td class="n">${e(formatPaise(t.cgst))}</td></tr>
  <tr><th>SGST @ ${e(halfRate(t.rateBps))}</th><td class="n">${e(formatPaise(t.sgst))}</td></tr>
  <tr class="sum"><th>Total (GST included)</th><td class="n">${e(formatPaise(r.amount))}</td></tr>
</table>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Fee receipt ${e(r.number)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A5 portrait; margin: 10mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0B1220; margin: 0; font-size: 10pt; position: relative; }
  .head { text-align: center; border-bottom: 2px solid #0B1220; padding-bottom: 6pt; margin-bottom: 8pt; }
  .logo { width: 17mm; height: 17mm; display: block; margin: 0 auto 3pt; }
  .academy { font-size: 15pt; font-weight: 700; }
  .branch { font-size: 10pt; font-weight: 600; color: #3A4657; }
  .contact, .gstin { font-size: 8.5pt; color: #3A4657; }
  h1 { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; margin: 0 0 6pt; }
  .meta { display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 8pt; }
  .meta b { font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
  th, td { text-align: left; padding: 2.5pt 4pt; vertical-align: top; }
  th { width: 34%; font-weight: 500; color: #3A4657; }
  td { font-weight: 600; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .amount { border: 1.5px solid #0B1220; border-radius: 3pt; padding: 6pt 8pt; margin-bottom: 8pt; }
  .amount .fig { font-size: 16pt; font-weight: 700; font-variant-numeric: tabular-nums; }
  .amount .words { font-size: 9.5pt; font-style: italic; margin-top: 2pt; }
  .realise { font-weight: 500; font-style: italic; color: #3A4657; }
  .bounced, .cancel-note { font-weight: 700; color: #A82418; }
  .gst { border: 1px solid #BFC6D0; }
  .gst th, .gst td { border-bottom: 1px solid #EDF0F4; }
  .gst .sum th, .gst .sum td { font-weight: 700; color: #0B1220; }
  .balance { font-size: 10.5pt; font-weight: 700; margin: 4pt 0 8pt; }
  .note { font-size: 8.5pt; color: #3A4657; margin-bottom: 8pt; white-space: pre-wrap; }
  .sign { margin-top: 28pt; display: flex; justify-content: flex-end; }
  .sign div { border-top: 1px solid #0B1220; padding-top: 3pt; min-width: 45mm; text-align: center; font-size: 9pt; }
  .watermark { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 64pt; font-weight: 800; color: rgba(168, 36, 24, 0.18); transform: rotate(-28deg); letter-spacing: 0.1em; pointer-events: none; }
</style></head>
<body>
${r.cancelled ? `<div class="watermark">CANCELLED</div>` : ""}
<div class="head">
  <img class="logo" src="${LOGO_DATA_URI}" alt="" />
  <div class="academy">${e(a.name)}</div>
  ${a.branch ? `<div class="branch">${e(a.branch)}</div>` : ""}
  ${contact ? `<div class="contact">${e(contact)}</div>` : ""}
  ${a.gstin ? `<div class="gstin">GSTIN ${e(a.gstin)}</div>` : ""}
</div>
<h1>Fee receipt</h1>
<div class="meta">
  <span>No. <b>${e(r.number)}</b></span>
  <span>Date <b>${e(formatDay(r.date))}</b></span>
  ${p.year ? `<span>Year <b>${e(p.year)}</b></span>` : ""}
</div>
${r.cancelled ? `<p class="cancel-note">This receipt was cancelled${r.cancelReason ? ` — ${e(r.cancelReason)}` : ""}. It does not count.</p>` : ""}
<table>
  ${row("Student", s.name)}
  ${row("GR number", s.grNumber)}
  ${row("Standard", s.standard)}
  ${row("Batch", s.batch)}
  ${row("Parent", s.guardian)}
</table>
<div class="amount">
  <div class="fig">${e(formatPaise(r.amount))}</div>
  <div class="words">${e(r.amountInWords)}</div>
</div>
<table>
  ${payment}
  ${row("Note", r.note)}
</table>
${gst}
<div class="balance">Balance after this receipt: ${e(formatPaise(p.balanceAfter))}</div>
${a.note ? `<div class="note">${e(a.note)}</div>` : ""}
<div class="sign"><div>Received by</div></div>
</body></html>`;
}
