import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { lecturesApi, type LectureFilter } from "../api/lecturesApi";
import type { LecturePatch } from "../types";

export function useLectureList(params: LectureFilter, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["lectures", params],
    queryFn: () => lecturesApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
    // states move with the clock (upcoming → ongoing → conducted)
    refetchInterval: 60_000,
  });
}

export function useLectureCalendar(params: { month: string; batchId?: string; teacherId?: string }) {
  return useQuery({ queryKey: ["lectureCalendar", params], queryFn: () => lecturesApi.calendar(params), placeholderData: keepPreviousData });
}

/** Anything that changes a lecture refreshes every view of lectures, registers and pay. */
export function useLectureActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    for (const key of ["lectures", "lectureCalendar", "register", "lectureRegister", "payroll", "teacherLectures", "teaching"]) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
  return {
    create: useMutation({ mutationFn: lecturesApi.create, onSuccess: invalidate }),
    plan: useMutation({ mutationFn: lecturesApi.plan, onSuccess: invalidate }),
    update: useMutation({ mutationFn: (v: { id: string; patch: LecturePatch }) => lecturesApi.update(v.id, v.patch), onSuccess: invalidate }),
    cancel: useMutation({
      mutationFn: (v: { id: string; reason?: string; notify?: boolean }) => lecturesApi.cancel(v.id, { reason: v.reason, notify: v.notify }),
      onSuccess: invalidate,
    }),
  };
}
