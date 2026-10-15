import { apiClient } from "@api/apiClient";
import type { Exam, ExamFilter, ExamInput, ExamPatch, ExamSheet, ExamWithTold, MarkRow } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const examsApi = Object.freeze({
  list: (params: ExamFilter) => data<Exam[]>(apiClient.get("/exams", { params })),
  sheet: (id: string) => data<ExamSheet>(apiClient.get(`/exams/${id}`)),
  create: (body: ExamInput) => data<Exam>(apiClient.post("/exams", body)),
  update: (id: string, patch: ExamPatch) => data<Exam>(apiClient.patch(`/exams/${id}`, patch)),
  setMarks: (id: string, rows: MarkRow[]) => data<ExamSheet>(apiClient.put(`/exams/${id}/marks`, { rows })),
  announce: (id: string) => data<ExamWithTold>(apiClient.post(`/exams/${id}/announce`, {})),
  publish: (id: string, body: { force?: boolean }) => data<ExamSheet>(apiClient.post(`/exams/${id}/publish`, body)),
  cancel: (id: string, body: { reason?: string; notify?: boolean }) => data<ExamWithTold>(apiClient.post(`/exams/${id}/cancel`, body)),
});
