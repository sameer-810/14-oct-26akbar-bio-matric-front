import { apiClient } from "@api/apiClient";
import type { PunchDays } from "@shared/ui";
import type { StaffUser, RoleCatalogue, CreateUserInput, UpdateUserInput, Paginated } from "../types";

export const usersApi = Object.freeze({
  async list(params: { search?: string; active?: boolean; page?: number }): Promise<Paginated<StaffUser>> {
    const { data } = await apiClient.get("/users", {
      params: { ...params, active: params.active === undefined ? undefined : String(params.active) },
    });
    return { data: data.data, meta: data.meta };
  },
  async roles(): Promise<RoleCatalogue> {
    return (await apiClient.get("/users/roles")).data.data;
  },
  async get(id: string): Promise<StaffUser> {
    return (await apiClient.get(`/users/${id}`)).data.data;
  },
  async create(input: CreateUserInput): Promise<{ user: StaffUser; temporaryPassword: string }> {
    return (await apiClient.post("/users", input)).data.data;
  },
  async update(id: string, patch: UpdateUserInput): Promise<StaffUser> {
    return (await apiClient.patch(`/users/${id}`, patch)).data.data;
  },
  async days(id: string, from: string, to: string): Promise<PunchDays> {
    return (await apiClient.get(`/users/${id}/days`, { params: { from, to } })).data.data;
  },
  async resetPassword(id: string): Promise<{ user: StaffUser; temporaryPassword: string }> {
    return (await apiClient.post(`/users/${id}/reset-password`)).data.data;
  },
});
