import { apiClient } from "@api/apiClient";
import type { Issue, IssueAssignee, IssueFilter, IssueInput, IssuePatch } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const issuesApi = Object.freeze({
  list: (params: IssueFilter) => data<Issue[]>(apiClient.get("/issues", { params })),
  get: (id: string) => data<Issue>(apiClient.get(`/issues/${id}`)),
  assignees: () => data<IssueAssignee[]>(apiClient.get("/issues/assignees")),
  create: (body: IssueInput) => data<Issue>(apiClient.post("/issues", body)),
  update: (id: string, patch: IssuePatch) => data<Issue>(apiClient.patch(`/issues/${id}`, patch)),
  comment: (id: string, body: { body: string; internal?: boolean }) => data<Issue>(apiClient.post(`/issues/${id}/comments`, body)),
});
