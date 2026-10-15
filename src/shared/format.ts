/**
 * Every date and time on screen is academy time (India), whatever zone the
 * phone or browser is set to — a parent abroad must still see "reached class
 * at 5:04 pm", not their local time.
 */
const TZ = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });

const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));

export function formatDate(v: string | number | Date | null | undefined) {
  return v ? dateFmt.format(toDate(v)) : "—";
}

export function formatTime(v: string | number | Date | null | undefined) {
  return v ? timeFmt.format(toDate(v)).replace(/\s?([ap])m$/i, " $1m").toLowerCase() : "—";
}

export function formatDateTime(v: string | number | Date | null | undefined) {
  return v ? `${formatDate(v)}, ${formatTime(v)}` : "—";
}

/** "just now", "4 min ago", "3 h ago", else the date. */
export function formatRelative(v: string | number | Date | null | undefined, now = Date.now()) {
  if (!v) return "never";
  const s = Math.round((now - toDate(v).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return formatDate(v);
}

/** Today as the academy's "YYYY-MM-DD", whatever zone this device is in. */
export function academyToday(now = Date.now()) {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

/** A calendar day "YYYY-MM-DD" → "14 Oct 2026" (read as noon IST so no zone can move it a day). */
export function formatDay(ymd: string | null | undefined) {
  return ymd ? formatDate(`${ymd}T12:00:00+05:30`) : "—";
}

/** "16:05" → "4:05 pm" — a lecture's wall-clock time, no zone involved. */
export function formatWallTime(hhmm: string | null | undefined) {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Whole days added to a "YYYY-MM-DD" (read at noon UTC, so no zone moves it). */
export function addDaysTo(ymd: string, n: number) {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** "2026-10" → "October 2026". */
export function formatMonth(ym: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
}

/** The month before or after "YYYY-MM". */
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const n = y * 12 + (m - 1) + delta;
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
}

/** ₹ in the Indian grouping: 125000 → "₹1,25,000". */
export function formatRupees(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Money from the server is whole paise: 1250050 → "₹12,500.50", 1250000 → "₹12,500". */
export function formatPaise(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "—";
  const rupees = paise / 100;
  return `${paise < 0 ? "−" : ""}₹${Math.abs(rupees).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/**
 * What someone typed as rupees ("12,500", "12500.5") → whole paise, or null
 * when it is not an amount. Done on the digits, never through floating point.
 */
export function parseRupees(text: string): number | null {
  const t = text.replace(/[,\s₹]/g, "");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
