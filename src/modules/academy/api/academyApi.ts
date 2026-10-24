import { apiClient } from "@api/apiClient";
import type { InstituteSettings, AcademicYear, Standard, School, Batch, Holiday } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const academyApi = Object.freeze({
  settings: () => data<InstituteSettings>(apiClient.get("/settings")),
  updateSettings: (patch: Partial<InstituteSettings>) => data<InstituteSettings>(apiClient.patch("/settings", patch)),

  years: () => data<AcademicYear[]>(apiClient.get("/academic-years")),
  createYear: (y: Omit<AcademicYear, "id" | "isCurrent">) => data<AcademicYear>(apiClient.post("/academic-years", y)),
  makeYearCurrent: (id: string) => data<AcademicYear>(apiClient.post(`/academic-years/${id}/current`)),

  standards: () => data<Standard[]>(apiClient.get("/standards")),
  createStandard: (s: Partial<Standard>) => data<Standard>(apiClient.post("/standards", s)),
  updateStandard: (id: string, s: Partial<Standard>) => data<Standard>(apiClient.patch(`/standards/${id}`, s)),
  nextGr: (id: string) => data<{ next: string }>(apiClient.get(`/standards/${id}/next-gr`)),

  schools: () => data<School[]>(apiClient.get("/schools", { params: { active: "true" } })),
  createSchool: (name: string) => data<School>(apiClient.post("/schools", { name })),

  batches: (params: { academicYearId?: string; standardId?: string } = {}) => data<Batch[]>(apiClient.get("/batches", { params })),
  createBatch: (b: Partial<Batch>) => data<Batch>(apiClient.post("/batches", b)),
  updateBatch: (id: string, b: Partial<Batch>) => data<Batch>(apiClient.patch(`/batches/${id}`, b)),
  // only a batch that was never used; the server says so otherwise
  removeBatch: async (id: string) => {
    await apiClient.delete(`/batches/${id}`);
  },

  holidays: (params: { from?: string; to?: string } = {}) => data<Holiday[]>(apiClient.get("/holidays", { params })),
  createHoliday: (h: Omit<Holiday, "id">) => data<Holiday>(apiClient.post("/holidays", h)),
  removeHoliday: (id: string) => apiClient.delete(`/holidays/${id}`),
});
