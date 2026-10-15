import { apiClient } from "@api/apiClient";
import type {
  FeePlan,
  PlanInput,
  PlanPatch,
  FeeAccount,
  SetUpInput,
  RevisePatch,
  CollectInput,
  Receipt,
  RefundInput,
  Refund,
  ChequeActionInput,
  OutstandingRow,
  OutstandingFilter,
  ReceiptFilter,
  PrintableReceipt,
} from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const feesApi = Object.freeze({
  plans: (params: { academicYearId?: string; standardId?: string }) => data<FeePlan[]>(apiClient.get("/fees/plans", { params })),
  createPlan: (body: PlanInput) => data<FeePlan>(apiClient.post("/fees/plans", body)),
  updatePlan: (id: string, patch: PlanPatch) => data<FeePlan>(apiClient.patch(`/fees/plans/${id}`, patch)),
  applyPlan: (id: string) => data<{ created: number; alreadySetUp: number }>(apiClient.post(`/fees/plans/${id}/apply`)),

  /** null when the student's fees for the year are not set up yet. */
  account: (studentId: string, params: { academicYearId?: string } = {}) =>
    data<FeeAccount | null>(apiClient.get(`/fees/students/${studentId}`, { params })),
  setUp: (studentId: string, body: SetUpInput) => data<FeeAccount>(apiClient.post(`/fees/students/${studentId}`, body)),
  revise: (accountId: string, patch: RevisePatch) => data<FeeAccount>(apiClient.patch(`/fees/accounts/${accountId}`, patch)),
  collect: (studentId: string, body: CollectInput) => data<Receipt>(apiClient.post(`/fees/students/${studentId}/receipts`, body)),
  refund: (studentId: string, body: RefundInput) => data<Refund>(apiClient.post(`/fees/students/${studentId}/refunds`, body)),

  receipts: (params: ReceiptFilter) => data<Receipt[]>(apiClient.get("/fees/receipts", { params })),
  printable: (id: string) => data<PrintableReceipt>(apiClient.get(`/fees/receipts/${id}`)),
  cancelReceipt: (id: string, reason: string) => data<Receipt>(apiClient.post(`/fees/receipts/${id}/cancel`, { reason })),
  cheque: (id: string, body: ChequeActionInput) => data<Receipt>(apiClient.post(`/fees/receipts/${id}/cheque`, body)),

  // the server reads the flag as the text "true"/"false", and only when present
  outstanding: ({ overdueOnly, ...rest }: OutstandingFilter) =>
    data<OutstandingRow[]>(apiClient.get("/fees/outstanding", { params: { ...rest, overdueOnly: overdueOnly ? "true" : undefined } })),
});
