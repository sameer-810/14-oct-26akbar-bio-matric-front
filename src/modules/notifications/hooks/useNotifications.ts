import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { notificationsApi } from "../api/notificationsApi";
import type { AlertStatus, AlertType } from "../types";

export function useAlertLog(params: { status?: AlertStatus; type?: AlertType; page?: number }) {
  return useQuery({
    queryKey: ["alertLog", params],
    queryFn: () => notificationsApi.log(params),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

/** How many families an alert can reach; the take-up the owner watches after go-live. */
export function useAlertReach(enabled = true) {
  return useQuery({ queryKey: ["alertReach"], queryFn: notificationsApi.status, enabled, staleTime: 60_000 });
}
