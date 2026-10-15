import { apiClient } from "@api/apiClient";
import type { PayRate, PayrollRow, TeacherMonth, PayKind } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export interface RateInput {
  effectiveFrom: string;
  kind: PayKind;
  rate: number;
  subjectRates?: { subject: string; rate: number }[];
  note?: string;
}

export const payrollApi = Object.freeze({
  report: (month: string) => data<PayrollRow[]>(apiClient.get("/payroll/report", { params: { month } })),
  teacherMonth: (teacherId: string, month: string) => data<TeacherMonth>(apiClient.get(`/payroll/teachers/${teacherId}`, { params: { month } })),
  rates: (teacherId: string) => data<PayRate[]>(apiClient.get(`/payroll/teachers/${teacherId}/rates`)),
  setRate: (teacherId: string, body: RateInput) => data<PayRate>(apiClient.post(`/payroll/teachers/${teacherId}/rates`, body)),
  removeRate: (teacherId: string, rateId: string) => data<PayRate>(apiClient.delete(`/payroll/teachers/${teacherId}/rates/${rateId}`)),
});
