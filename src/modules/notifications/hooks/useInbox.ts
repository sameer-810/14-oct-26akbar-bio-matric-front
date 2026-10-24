import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api/apiClient";

export interface InboxNote {
  id: string;
  type: "entry" | "exit" | "unknown_id" | "device_pending";
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface Inbox {
  items: InboxNote[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

const getInbox = (params: { unread?: boolean; page?: number; limit?: number }) =>
  apiClient
    .get("/inbox", { params: { ...params, unread: params.unread ? "true" : undefined } })
    .then((r) => r.data.data as Inbox);

/** One's own in-app notes. Polled: a new one appears within the interval. */
export function useInbox(page = 1) {
  return useQuery({ queryKey: ["inbox", page], queryFn: () => getInbox({ page, limit: 30 }), refetchInterval: 20_000 });
}

/** The unread ones, polled for the bell, the badge and the pop-up. */
export function useUnreadInbox(enabled = true) {
  return useQuery({
    queryKey: ["inbox", "unread"],
    queryFn: () => getInbox({ unread: true, limit: 20 }),
    refetchInterval: 20_000,
    enabled,
  });
}

export function useMarkInboxRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[] } | { all: true }) => apiClient.post("/inbox/read", body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
}
