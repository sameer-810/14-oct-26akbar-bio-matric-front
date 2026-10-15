import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { payrollApi, type RateInput } from "../api/payrollApi";

export const usePayrollReport = (month: string) =>
  useQuery({ queryKey: ["payroll", "report", month], queryFn: () => payrollApi.report(month), placeholderData: keepPreviousData });

export const useTeacherMonth = (teacherId: string, month: string, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["payroll", "teacher", teacherId, month],
    queryFn: () => payrollApi.teacherMonth(teacherId, month),
    enabled,
    placeholderData: keepPreviousData,
  });

export const usePayRates = (teacherId: string, { enabled = true } = {}) =>
  useQuery({ queryKey: ["payroll", "rates", teacherId], queryFn: () => payrollApi.rates(teacherId), enabled });

export function useRateActions(teacherId: string) {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["payroll"] });
  return {
    set: useMutation({ mutationFn: (body: RateInput) => payrollApi.setRate(teacherId, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (rateId: string) => payrollApi.removeRate(teacherId, rateId), onSuccess: invalidate }),
  };
}
