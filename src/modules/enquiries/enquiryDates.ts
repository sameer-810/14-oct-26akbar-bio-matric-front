import { addDaysTo } from "@shared/format";

export const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** The Monday of the week a "YYYY-MM-DD" falls in — the board's weeks start on Monday. */
export function mondayOf(ymd: string) {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return addDaysTo(ymd, -((dow + 6) % 7));
}

const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });

/** "2026-10-19" → "Mon". */
export const weekdayOf = (ymd: string) => weekdayFmt.format(new Date(`${ymd}T12:00:00Z`));

/**
 * A follow-up's date and wall time as the instant the server wants. The
 * academy is in India, so the offset is always +05:30 whatever the device says.
 */
export function followUpInstant(date: string, time: string) {
  const [h, m] = time.trim().split(":");
  return `${date.trim()}T${h.padStart(2, "0")}:${m}:00+05:30`;
}
