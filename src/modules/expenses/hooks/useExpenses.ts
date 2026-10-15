import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { expensesApi } from "../api/expensesApi";
import type { ExpenseFilter } from "../types";

export function useExpenseList(filter: ExpenseFilter, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["expenses", "list", filter],
    queryFn: () => expensesApi.list(filter),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useExpenseCategories() {
  return useQuery({ queryKey: ["expenses", "categories"], queryFn: expensesApi.categories, staleTime: 5 * 60_000 });
}

/** Money in and out for a range; the dashboard polls it so the desk's numbers stay current. */
export function useMoneySummary(range: { from: string; to: string }, { enabled = true, refetchInterval }: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ["fees", "summary", range],
    queryFn: () => expensesApi.summary(range),
    enabled,
    refetchInterval,
  });
}

/** Adding or cancelling an expense changes the lists and the money-in-against-money-out figures. */
export function useExpenseActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["expenses"] });
    void qc.invalidateQueries({ queryKey: ["fees", "summary"] });
  };
  return {
    create: useMutation({ mutationFn: expensesApi.create, onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: (v: { id: string; reason: string }) => expensesApi.cancel(v.id, v.reason), onSuccess: invalidate }),
  };
}
