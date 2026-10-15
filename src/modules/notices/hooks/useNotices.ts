import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { noticesApi } from "../api/noticesApi";
import type { NoticePatch } from "../types";

export function useNotices(params: { includeExpired?: boolean } = {}) {
  return useQuery({
    queryKey: ["notices", params],
    queryFn: () => noticesApi.list(params.includeExpired ? { includeExpired: true } : {}),
    placeholderData: keepPreviousData,
  });
}

/** Every change refreshes the board, with or without expired notices. */
export function useNoticeActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["notices"] });
  return {
    create: useMutation({ mutationFn: noticesApi.create, onSuccess: invalidate }),
    update: useMutation({ mutationFn: (v: { id: string; patch: NoticePatch }) => noticesApi.update(v.id, v.patch), onSuccess: invalidate }),
    notify: useMutation({ mutationFn: noticesApi.notify, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: noticesApi.remove, onSuccess: invalidate }),
  };
}
