import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teachersApi } from "../api/teachersApi";
import type { TeacherInput } from "../types";

export function useTeachers(params: { search?: string; active?: boolean } = {}) {
  return useQuery({ queryKey: ["teachers", params], queryFn: () => teachersApi.list(params) });
}

export const useTeacher = (id: string) => useQuery({ queryKey: ["teachers", "one", id], queryFn: () => teachersApi.get(id) });

export const useTeacherLectures = (id: string, from: string, to: string) =>
  useQuery({ queryKey: ["teacherLectures", id, from, to], queryFn: () => teachersApi.lectures(id, from, to) });

export const useTeacherDays = (id: string, from: string, to: string) =>
  useQuery({ queryKey: ["teacherDays", id, from, to], queryFn: () => teachersApi.days(id, from, to) });

export function useSaveTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TeacherInput & { id?: string }) => (id ? teachersApi.update(id, input) : teachersApi.create(input)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}
