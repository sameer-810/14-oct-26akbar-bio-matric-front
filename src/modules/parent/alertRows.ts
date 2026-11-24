import { academyToday } from "@shared/format";
import type { ParentMessage } from "./types";

/** A child's day: when they reached class and when they left; null is still pending. */
export interface DayRow {
  kind: "day";
  key: string;
  studentId: string | null;
  date: string;
  reachedAt: string | null;
  leftAt: string | null;
  /** the alerts it was made from, for marking read */
  ids: string[];
  read: boolean;
  /** the newest of them, for ordering among the other alerts */
  createdAt: string;
}

export interface MessageRow {
  kind: "message";
  key: string;
  message: ParentMessage;
  createdAt: string;
}

export type AlertRow = DayRow | MessageRow;

/** The academy date an entry or exit belongs to: its own, else the punch or sent time's. */
const dayOf = (m: ParentMessage) => m.date ?? academyToday(new Date(m.at ?? m.createdAt).getTime());
const timeOf = (m: ParentMessage) => m.at ?? m.createdAt;

/**
 * The inbox as the parent reads it: a child's "reached" and "left" for one
 * date become one row; every other alert stays as it is. Only what was
 * loaded is grouped; nothing is changed or deleted.
 */
export function toAlertRows(items: ParentMessage[]): AlertRow[] {
  const days = new Map<string, DayRow>();
  const rows: AlertRow[] = [];
  for (const m of items) {
    if (m.type !== "entry" && m.type !== "exit") {
      rows.push({ kind: "message", key: m.id, message: m, createdAt: m.createdAt });
      continue;
    }
    const date = dayOf(m);
    const key = `${m.studentId ?? "?"}|${date}`;
    let day = days.get(key);
    if (!day) {
      day = { kind: "day", key, studentId: m.studentId, date, reachedAt: null, leftAt: null, ids: [], read: true, createdAt: m.createdAt };
      days.set(key, day);
      rows.push(day);
    }
    const at = timeOf(m);
    // a repeated alert never shows twice: the first arrival and the last departure
    if (m.type === "entry" && (!day.reachedAt || at < day.reachedAt)) day.reachedAt = at;
    if (m.type === "exit" && (!day.leftAt || at > day.leftAt)) day.leftAt = at;
    day.ids.push(m.id);
    day.read &&= m.read;
    if (m.createdAt > day.createdAt) day.createdAt = m.createdAt;
  }
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
