import { apiClient } from "@api/apiClient";
import type { ParentAccount } from "@shared/store/useAuthStore";
import type { Child, ChildToday, Overview, ChildDays, Leave, Inbox, ParentAppSettings, ParentMessage, FamilyFees, TestResult, FamilyNotice, FamilyDocument, FamilyIssue, IssueCategory } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** The parent app's API. Every child route answers 404 for a child not in this family. */
export const parentApi = Object.freeze({
  settings: () => data<ParentAppSettings>(apiClient.get("/parent/settings")),
  children: () => data<Child[]>(apiClient.get("/parent/children")),
  today: (studentId: string) => data<ChildToday>(apiClient.get(`/parent/children/${studentId}/today`)),
  overview: (studentId: string) => data<Overview>(apiClient.get(`/parent/children/${studentId}/overview`)),
  days: (studentId: string, from: string, to: string) =>
    data<ChildDays>(apiClient.get(`/parent/children/${studentId}/days`, { params: { from, to } })),
  leaves: (studentId: string) => data<Leave[]>(apiClient.get(`/parent/children/${studentId}/leaves`)),
  applyLeave: (studentId: string, body: { from: string; to: string; reason: string }) =>
    data<Leave>(apiClient.post(`/parent/children/${studentId}/leaves`, body)),

  results: (studentId: string) => data<TestResult[]>(apiClient.get(`/parent/children/${studentId}/results`)),
  fees: (studentId: string) => data<FamilyFees | null>(apiClient.get(`/parent/children/${studentId}/fees`)),
  notices: () => data<FamilyNotice[]>(apiClient.get("/parent/notices")),
  documents: () => data<FamilyDocument[]>(apiClient.get("/parent/documents")),
  documentLink: (id: string) => data<{ url: string; expiresInMinutes: number }>(apiClient.get(`/parent/documents/${id}/link`)),
  issues: () => data<FamilyIssue[]>(apiClient.get("/parent/issues")),
  issue: (id: string) => data<FamilyIssue>(apiClient.get(`/parent/issues/${id}`)),
  raiseIssue: (body: { title: string; description: string; category?: IssueCategory; studentId?: string }) =>
    data<FamilyIssue>(apiClient.post("/parent/issues", body)),
  commentOnIssue: (id: string, body: string) => data<FamilyIssue>(apiClient.post(`/parent/issues/${id}/comments`, { body })),

  inbox: (page = 1) =>
    apiClient.get("/parent/notifications", { params: { page } }).then(
      (r): Inbox => ({ items: r.data.data as ParentMessage[], ...(r.data.meta as Omit<Inbox, "items">) }),
    ),
  markRead: (ids?: string[]) => data<{ updated: number }>(apiClient.post("/parent/notifications/read", { ids })),
  setPushToken: (token: string) => apiClient.put("/parent/push-token", { token }),
  setPreferences: (notify: Partial<ParentAccount["notify"]>) => data<ParentAccount>(apiClient.patch("/parent/preferences", notify)),
});
