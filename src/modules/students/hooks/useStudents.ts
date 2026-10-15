import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi, type StudentQuery } from "../api/studentsApi";
import type { AdmitInput } from "../types";

export function useStudents(q: StudentQuery) {
  return useQuery({ queryKey: ["students", q], queryFn: () => studentsApi.list(q) });
}

export function useStudent(id: string) {
  return useQuery({ queryKey: ["student", id], queryFn: () => studentsApi.get(id) });
}

/**
 * Only asks once a full 10-digit number is typed — and always asks fresh: an
 * answer cached from a moment ago ("no family login yet") is exactly wrong
 * right after that family's first child was admitted.
 */
export function useParentMatches(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return useQuery({
    queryKey: ["parentMatches", digits],
    queryFn: () => studentsApi.parentMatches(digits),
    enabled: /^[6-9]\d{9}$/.test(digits),
    staleTime: 0,
  });
}

function useInvalidateStudent(id?: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["students"] });
    void qc.invalidateQueries({ queryKey: ["batches"] });
    // an admission uses up a GR and may create a family login
    void qc.invalidateQueries({ queryKey: ["nextGr"] });
    void qc.invalidateQueries({ queryKey: ["parentMatches"] });
    if (id) void qc.invalidateQueries({ queryKey: ["student", id] });
  };
}

export function useAdmitStudent() {
  const invalidate = useInvalidateStudent();
  return useMutation({ mutationFn: (input: AdmitInput) => studentsApi.admit(input), onSuccess: invalidate });
}

export function useStudentActions(id: string) {
  const invalidate = useInvalidateStudent(id);
  return {
    changeBatch: useMutation({ mutationFn: (v: { batchId: string; from?: string }) => studentsApi.changeBatch(id, v.batchId, v.from), onSuccess: invalidate }),
    extend: useMutation({ mutationFn: (validTill: string) => studentsApi.extend(id, validTill), onSuccess: invalidate }),
    markLeft: useMutation({ mutationFn: (v: { reason?: string; removeFromDevices?: boolean }) => studentsApi.markLeft(id, v), onSuccess: invalidate }),
    resend: useMutation({ mutationFn: () => studentsApi.resendToDevices(id), onSuccess: invalidate }),
    resetParent: useMutation({ mutationFn: () => studentsApi.resetParentPassword(id) }),
    update: useMutation({ mutationFn: (patch: Parameters<typeof studentsApi.update>[1]) => studentsApi.update(id, patch), onSuccess: invalidate }),
  };
}
