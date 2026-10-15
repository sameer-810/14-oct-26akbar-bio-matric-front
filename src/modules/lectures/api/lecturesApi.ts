import { apiClient } from "@api/apiClient";
import type { Lecture, LectureInput, LecturePatch, PlanSlot, PlanResult, CalendarDay } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export interface LectureFilter {
  date?: string;
  from?: string;
  to?: string;
  batchId?: string;
  teacherId?: string;
}

export const lecturesApi = Object.freeze({
  list: (params: LectureFilter) => data<Lecture[]>(apiClient.get("/lectures/sessions", { params })),
  calendar: (params: { month: string; batchId?: string; teacherId?: string }) => data<CalendarDay[]>(apiClient.get("/lectures/calendar", { params })),
  create: (body: LectureInput) => data<Lecture>(apiClient.post("/lectures/sessions", body)),
  plan: (body: { batchId: string; from: string; to: string; slots: PlanSlot[] }) => data<PlanResult>(apiClient.post("/lectures/plan", body)),
  update: (id: string, patch: LecturePatch) => data<Lecture>(apiClient.patch(`/lectures/sessions/${id}`, patch)),
  cancel: (id: string, body: { reason?: string; notify?: boolean }) =>
    data<Lecture & { familiesTold: number }>(apiClient.post(`/lectures/sessions/${id}/cancel`, body)),
});
