import { apiClient } from "@api/apiClient";
import type { Expense, ExpenseFilter, ExpenseInput, MoneySummary } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** The server reads includeCancelled as the text "true"; leaving it out means "no". */
const listParams = ({ includeCancelled, category, ...rest }: ExpenseFilter) => ({
  ...rest,
  ...(category ? { category } : {}),
  ...(includeCancelled ? { includeCancelled: "true" } : {}),
});

export const expensesApi = Object.freeze({
  list: (filter: ExpenseFilter) => data<Expense[]>(apiClient.get("/expenses", { params: listParams(filter) })),
  categories: () => data<string[]>(apiClient.get("/expenses/categories")),
  create: (body: ExpenseInput) => data<Expense>(apiClient.post("/expenses", body)),
  cancel: (id: string, reason: string) => data<Expense>(apiClient.post(`/expenses/${id}/cancel`, { reason })),
  /** Lives under /fees, but anyone who handles expenses may read it. */
  summary: (range: { from: string; to: string }) => data<MoneySummary>(apiClient.get("/fees/summary", { params: range })),
});
