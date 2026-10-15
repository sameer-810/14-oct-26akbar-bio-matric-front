import { apiClient } from "@api/apiClient";
import type { Lecture } from "@modules/lectures/types";
import type { Teacher, TeacherDays } from "@modules/teachers/types";
import type { TeacherMonth } from "@modules/payroll/types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** A teacher's own login: everything is about the faculty member linked to it. */
export const teachingApi = Object.freeze({
  me: () => data<{ teacher: Teacher; allowed: { salary: boolean; cancelLecture: boolean } }>(apiClient.get("/teaching/me")),
  lectures: (from: string, to: string) => data<Lecture[]>(apiClient.get("/teaching/lectures", { params: { from, to } })),
  days: (from: string, to: string) => data<TeacherDays>(apiClient.get("/teaching/days", { params: { from, to } })),
  salary: (month: string) => data<TeacherMonth>(apiClient.get("/teaching/salary", { params: { month } })),
  cancel: (id: string, reason: string) => data<Lecture>(apiClient.post(`/teaching/lectures/${id}/cancel`, { reason })),
});
