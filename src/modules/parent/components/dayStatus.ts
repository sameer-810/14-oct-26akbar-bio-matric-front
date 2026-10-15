import { palette } from "@shared/designSystem";
import type { DayStatus } from "../types";

/** The colours of the parent's calendar; the same ones staff see on a student's card. */
export const DAY_COLORS: Record<DayStatus, { bg: string; text: string }> = {
  present: { bg: palette.success.bg, text: palette.success.text },
  late: { bg: palette.warning.bg, text: palette.warning.text },
  absent: { bg: palette.danger.bg, text: palette.danger.text },
  leave: { bg: palette.info.bg, text: palette.info.text },
  holiday: { bg: palette.surface.secondary, text: palette.text.tertiary },
};

export const DAY_LABELS: Record<DayStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  leave: "Leave",
  holiday: "Holiday",
};

export const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export const hoursAndMinutes = (minutes: number | null) =>
  minutes === null ? "—" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
