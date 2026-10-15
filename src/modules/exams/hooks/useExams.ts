import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { examsApi } from "../api/examsApi";
import type { ExamFilter, ExamInput, ExamPatch, ExamSheet, MarkRow } from "../types";

export function useExamList(params: ExamFilter) {
  return useQuery({ queryKey: ["exams", params], queryFn: () => examsApi.list(params), placeholderData: keepPreviousData });
}

export function useExamSheet(id: string) {
  return useQuery({ queryKey: ["examSheet", id], queryFn: () => examsApi.sheet(id), enabled: Boolean(id) });
}

/**
 * Anything that changes a test refreshes the list and every open sheet. Calls
 * that answer with the whole sheet put it straight in the cache, so the grid
 * shows the saved marks without waiting for the refetch.
 */
export function useExamActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    for (const key of ["exams", "examSheet"]) void qc.invalidateQueries({ queryKey: [key] });
  };
  const withSheet = (s: ExamSheet) => {
    qc.setQueryData(["examSheet", s.exam.id], s);
    invalidate();
  };
  return {
    create: useMutation({ mutationFn: (body: ExamInput) => examsApi.create(body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (v: { id: string; patch: ExamPatch }) => examsApi.update(v.id, v.patch), onSuccess: invalidate }),
    setMarks: useMutation({ mutationFn: (v: { id: string; rows: MarkRow[] }) => examsApi.setMarks(v.id, v.rows), onSuccess: withSheet }),
    announce: useMutation({ mutationFn: (id: string) => examsApi.announce(id), onSuccess: invalidate }),
    publish: useMutation({ mutationFn: (v: { id: string; force?: boolean }) => examsApi.publish(v.id, { force: v.force }), onSuccess: withSheet }),
    cancel: useMutation({
      mutationFn: (v: { id: string; reason?: string; notify?: boolean }) => examsApi.cancel(v.id, { reason: v.reason, notify: v.notify }),
      onSuccess: invalidate,
    }),
  };
}
