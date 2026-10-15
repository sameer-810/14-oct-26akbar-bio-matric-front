import { apiClient } from "@api/apiClient";

export interface AuditEntry {
  id: string;
  at: string;
  actorType: "staff" | "parent" | "system" | "device";
  actorId: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  meta: Record<string, unknown> | null;
  ip: string;
}

export interface AuditQuery {
  action?: string;
  from?: string;
  to?: string;
  page?: number;
}

export const auditApi = Object.freeze({
  async list(q: AuditQuery): Promise<{ data: AuditEntry[]; meta: { total: number; page: number; pages: number } }> {
    const { data } = await apiClient.get("/audit", { params: { ...q, limit: 50 } });
    return { data: data.data, meta: data.meta };
  },
});
