import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documentsApi";

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: documentsApi.list });
}

export function useDocumentActions() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["documents"] });
  return {
    share: useMutation({ mutationFn: documentsApi.share, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: documentsApi.remove, onSuccess: invalidate }),
  };
}
