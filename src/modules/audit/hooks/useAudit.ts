import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditQuery } from "../api/auditApi";

export function useAuditTrail(q: AuditQuery) {
  return useQuery({ queryKey: ["audit", q], queryFn: () => auditApi.list(q) });
}
