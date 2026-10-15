import { apiClient } from "@api/apiClient";
import type { AlertLog, AlertLogRow, AlertReach, AlertStatus, AlertType } from "../types";

export const notificationsApi = Object.freeze({
  log: (params: { status?: AlertStatus; type?: AlertType; studentId?: string; page?: number }) =>
    apiClient.get("/notifications", { params }).then(
      (r): AlertLog => ({ items: r.data.data as AlertLogRow[], ...(r.data.meta as Omit<AlertLog, "items">) }),
    ),
  status: () => apiClient.get("/notifications/status").then((r) => r.data.data as AlertReach),
});
