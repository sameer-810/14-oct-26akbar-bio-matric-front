import { apiClient } from "@api/apiClient";
import type { Teacher, TeacherInput, TeacherDays } from "../types";
import type { Lecture } from "@modules/lectures/types";

export const teachersApi = Object.freeze({
  async list(params: { search?: string; active?: boolean } = {}): Promise<Teacher[]> {
    const { data } = await apiClient.get("/teachers", {
      params: { search: params.search, active: params.active === undefined ? undefined : String(params.active) },
    });
    return data.data;
  },
  async get(id: string): Promise<Teacher> {
    return (await apiClient.get(`/teachers/${id}`)).data.data;
  },
  async lectures(id: string, from: string, to: string): Promise<Lecture[]> {
    return (await apiClient.get(`/teachers/${id}/lectures`, { params: { from, to } })).data.data;
  },
  async days(id: string, from: string, to: string): Promise<TeacherDays> {
    return (await apiClient.get(`/teachers/${id}/days`, { params: { from, to } })).data.data;
  },
  async create(input: TeacherInput): Promise<Teacher> {
    return (await apiClient.post("/teachers", input)).data.data;
  },
  async update(id: string, patch: Partial<TeacherInput>): Promise<Teacher> {
    return (await apiClient.patch(`/teachers/${id}`, patch)).data.data;
  },
});
