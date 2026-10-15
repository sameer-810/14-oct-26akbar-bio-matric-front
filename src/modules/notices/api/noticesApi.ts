import { apiClient } from "@api/apiClient";
import type { Notice, NoticeInput, NoticePatch } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const noticesApi = Object.freeze({
  list: (params: { includeExpired?: boolean }) => data<Notice[]>(apiClient.get("/notices", { params })),
  create: (body: NoticeInput) => data<Notice>(apiClient.post("/notices", body)),
  update: (id: string, patch: NoticePatch) => data<Notice>(apiClient.patch(`/notices/${id}`, patch)),
  notify: (id: string) => data<Notice>(apiClient.post(`/notices/${id}/notify`)),
  remove: (id: string) => data<Notice>(apiClient.delete(`/notices/${id}`)),
});
