import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { enquiriesApi } from "../api/enquiriesApi";
import type { ConvertInput, Enquiry, EnquiryFilter, EnquiryPatch, FollowUpInput, TaskPatch } from "../types";

export function useEnquiryList(params: EnquiryFilter, { enabled = true } = {}) {
  return useQuery({ queryKey: ["enquiries", "list", params], queryFn: () => enquiriesApi.list(params), enabled, placeholderData: keepPreviousData });
}

export function useEnquiry(id: string) {
  return useQuery({ queryKey: ["enquiries", "one", id], queryFn: () => enquiriesApi.get(id), enabled: Boolean(id) });
}

export function useFollowUpBoard(params: { week: string; assigneeId?: string }, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["enquiries", "board", params],
    queryFn: () => enquiriesApi.board(params),
    enabled,
    placeholderData: keepPreviousData,
    // a call becomes overdue as the clock passes it
    refetchInterval: 5 * 60_000,
  });
}

export function useEnquiryAssignees({ enabled = true } = {}) {
  return useQuery({ queryKey: ["enquiries", "assignees"], queryFn: enquiriesApi.assignees, enabled, staleTime: 5 * 60_000 });
}

/**
 * Existing leads and students with this mobile — asked only once a full
 * 10-digit number is typed, and always fresh, so nobody is entered twice.
 */
export function useEnquiryMatches(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return useQuery({
    queryKey: ["enquiries", "matches", digits],
    queryFn: () => enquiriesApi.matches(digits),
    enabled: /^[6-9]\d{9}$/.test(digits),
    staleTime: 0,
  });
}

/**
 * Any change to a lead or a follow-up can move it in the list, on the board
 * and on its own page, so every one refreshes all of ["enquiries"]. Those that
 * return the whole lead seed its page first.
 */
export function useEnquiryActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["enquiries"] });
  const settle = (l?: Enquiry) => {
    if (l) qc.setQueryData(["enquiries", "one", l.id], l);
    invalidate();
  };
  return {
    create: useMutation({ mutationFn: enquiriesApi.create, onSuccess: settle }),
    update: useMutation({ mutationFn: (v: { id: string; patch: EnquiryPatch }) => enquiriesApi.update(v.id, v.patch), onSuccess: settle }),
    note: useMutation({ mutationFn: (v: { id: string; body: string }) => enquiriesApi.note(v.id, v.body), onSuccess: settle }),
    addTask: useMutation({ mutationFn: (v: { id: string; body: FollowUpInput }) => enquiriesApi.addTask(v.id, v.body), onSuccess: invalidate }),
    updateTask: useMutation({ mutationFn: (v: { taskId: string; patch: TaskPatch }) => enquiriesApi.updateTask(v.taskId, v.patch), onSuccess: invalidate }),
    message: useMutation({ mutationFn: enquiriesApi.message, onSuccess: invalidate }),
    convert: useMutation({
      mutationFn: (v: { id: string; body: ConvertInput }) => enquiriesApi.convert(v.id, v.body),
      onSuccess: () => {
        invalidate();
        // an admission like any other: a new student, a GR used, maybe a family login
        for (const key of ["students", "batches", "nextGr", "parentMatches"]) void qc.invalidateQueries({ queryKey: [key] });
      },
    }),
  };
}
