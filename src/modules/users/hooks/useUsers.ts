import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/usersApi";
import type { CreateUserInput, UpdateUserInput } from "../types";

export function useUsers(params: { search?: string; active?: boolean; page?: number }) {
  return useQuery({ queryKey: ["users", params], queryFn: () => usersApi.list(params) });
}

export function useRoleCatalogue() {
  return useQuery({ queryKey: ["roleCatalogue"], queryFn: usersApi.roles, staleTime: Infinity });
}

export function useUser(id: string) {
  return useQuery({ queryKey: ["user", id], queryFn: () => usersApi.get(id) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateUserInput) => usersApi.update(id, patch),
    onSuccess: (user) => {
      qc.setQueryData(["user", id], user);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResetPassword(id: string) {
  return useMutation({ mutationFn: () => usersApi.resetPassword(id) });
}
