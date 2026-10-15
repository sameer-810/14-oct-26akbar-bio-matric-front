import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiErrorMessage } from "@api/apiClient";
import { printHtml } from "@shared/print/printHtml";
import { feesApi } from "../api/feesApi";
import { receiptHtml } from "../print";
import type { OutstandingFilter, ReceiptFilter, PlanInput, PlanPatch, SetUpInput, RevisePatch, CollectInput, RefundInput, ChequeActionInput } from "../types";

export function useFeeAccount(studentId: string, { enabled = true } = {}) {
  return useQuery({ queryKey: ["fees", "account", studentId], queryFn: () => feesApi.account(studentId), enabled });
}

export function useFeePlans(params: { academicYearId?: string; standardId?: string }, { enabled = true } = {}) {
  return useQuery({ queryKey: ["fees", "plans", params], queryFn: () => feesApi.plans(params), enabled, placeholderData: keepPreviousData });
}

export function useOutstanding(params: OutstandingFilter) {
  return useQuery({ queryKey: ["fees", "outstanding", params], queryFn: () => feesApi.outstanding(params), placeholderData: keepPreviousData });
}

export function useReceipts(params: ReceiptFilter, { enabled = true } = {}) {
  return useQuery({ queryKey: ["fees", "receipts", params], queryFn: () => feesApi.receipts(params), enabled, placeholderData: keepPreviousData });
}

/** Any change to money refreshes every fee view: the account, the outstanding list, the day book and the cheques. */
export function useFeeActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["fees"] });
  return {
    createPlan: useMutation({ mutationFn: (body: PlanInput) => feesApi.createPlan(body), onSuccess: invalidate }),
    updatePlan: useMutation({ mutationFn: (v: { id: string; patch: PlanPatch }) => feesApi.updatePlan(v.id, v.patch), onSuccess: invalidate }),
    applyPlan: useMutation({ mutationFn: (id: string) => feesApi.applyPlan(id), onSuccess: invalidate }),
    setUp: useMutation({ mutationFn: (v: { studentId: string; body: SetUpInput }) => feesApi.setUp(v.studentId, v.body), onSuccess: invalidate }),
    revise: useMutation({ mutationFn: (v: { accountId: string; patch: RevisePatch }) => feesApi.revise(v.accountId, v.patch), onSuccess: invalidate }),
    collect: useMutation({ mutationFn: (v: { studentId: string; body: CollectInput }) => feesApi.collect(v.studentId, v.body), onSuccess: invalidate }),
    refund: useMutation({ mutationFn: (v: { studentId: string; body: RefundInput }) => feesApi.refund(v.studentId, v.body), onSuccess: invalidate }),
    cancelReceipt: useMutation({ mutationFn: (v: { id: string; reason: string }) => feesApi.cancelReceipt(v.id, v.reason), onSuccess: invalidate }),
    cheque: useMutation({ mutationFn: (v: { id: string; body: ChequeActionInput }) => feesApi.cheque(v.id, v.body), onSuccess: invalidate }),
  };
}

/**
 * Print a receipt as it stands on the server now — a reprint of a receipt
 * cancelled since shows the watermark. Fetched fresh every time.
 */
export function usePrintReceipt() {
  const qc = useQueryClient();
  const [printing, setPrinting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const print = async (id: string) => {
    setPrinting(id);
    setError(null);
    try {
      const p = await qc.fetchQuery({ queryKey: ["fees", "receipt", id], queryFn: () => feesApi.printable(id), staleTime: 0 });
      printHtml(receiptHtml(p));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load the receipt to print"));
    } finally {
      setPrinting(null);
    }
  };

  return { print, printing, error, clearError: () => setError(null) };
}
