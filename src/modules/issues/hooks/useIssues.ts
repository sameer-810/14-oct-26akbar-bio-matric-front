import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { issuesApi } from "../api/issuesApi";
import type { Issue, IssueFilter, IssuePatch } from "../types";

export function useIssueList(params: IssueFilter) {
  return useQuery({ queryKey: ["issues", "list", params], queryFn: () => issuesApi.list(params), placeholderData: keepPreviousData });
}

export function useIssue(id: string) {
  return useQuery({ queryKey: ["issues", "one", id], queryFn: () => issuesApi.get(id), enabled: Boolean(id) });
}

/** Only people who handle issues may ask who they can be given to (the server refuses everyone else). */
export function useIssueAssignees({ enabled = true } = {}) {
  return useQuery({ queryKey: ["issues", "assignees"], queryFn: issuesApi.assignees, enabled, staleTime: 5 * 60_000 });
}

/** Every change returns the whole issue: seed the detail with it, then refresh the lists. */
export function useIssueActions() {
  const qc = useQueryClient();
  const settle = (issue?: Issue) => {
    if (issue) qc.setQueryData(["issues", "one", issue.id], issue);
    void qc.invalidateQueries({ queryKey: ["issues", "list"] });
  };
  return {
    create: useMutation({ mutationFn: issuesApi.create, onSuccess: settle }),
    update: useMutation({ mutationFn: (v: { id: string; patch: IssuePatch }) => issuesApi.update(v.id, v.patch), onSuccess: settle }),
    comment: useMutation({
      mutationFn: (v: { id: string; body: string; internal?: boolean }) => issuesApi.comment(v.id, { body: v.body, internal: v.internal }),
      onSuccess: settle,
    }),
  };
}
