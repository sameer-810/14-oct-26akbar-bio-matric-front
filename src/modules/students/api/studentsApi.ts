import { apiClient } from "@api/apiClient";
import type { StudentListItem, Student, AdmitInput, AdmitResult, ParentMatch, StudentStatus } from "../types";

export interface StudentQuery {
  search?: string;
  batchId?: string;
  status?: StudentStatus;
  page?: number;
}

export const studentsApi = Object.freeze({
  async list(q: StudentQuery): Promise<{ data: StudentListItem[]; meta: { total: number; page: number; pages: number } }> {
    const { data } = await apiClient.get("/students", { params: { ...q, limit: 50 } });
    return { data: data.data, meta: data.meta };
  },
  async get(id: string): Promise<Student> {
    return (await apiClient.get(`/students/${id}`)).data.data;
  },
  async admit(input: AdmitInput): Promise<AdmitResult> {
    return (await apiClient.post("/students", input)).data.data;
  },
  async update(id: string, patch: Partial<AdmitInput> & { messaging?: Student["messaging"]; notes?: string }): Promise<Student> {
    return (await apiClient.patch(`/students/${id}`, patch)).data.data;
  },
  async changeBatch(id: string, batchId: string, from?: string): Promise<Student> {
    return (await apiClient.post(`/students/${id}/change-batch`, { batchId, from })).data.data;
  },
  async extend(id: string, validTill: string): Promise<Student> {
    return (await apiClient.post(`/students/${id}/extend`, { validTill })).data.data;
  },
  async markLeft(id: string, body: { reason?: string; removeFromDevices?: boolean }): Promise<Student> {
    return (await apiClient.post(`/students/${id}/left`, body)).data.data;
  },
  async resendToDevices(id: string): Promise<{ queued: number }> {
    return (await apiClient.post(`/students/${id}/resend-to-devices`)).data.data;
  },
  async resetParentPassword(id: string): Promise<{ username: string; temporaryPassword: string }> {
    return (await apiClient.post(`/students/${id}/parent-password`)).data.data;
  },
  async parentMatches(phone: string): Promise<ParentMatch[]> {
    return (await apiClient.get("/students/parent-matches", { params: { phone } })).data.data;
  },
});
