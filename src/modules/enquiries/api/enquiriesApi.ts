import { apiClient } from "@api/apiClient";
import type {
  ConvertInput,
  ConvertResult,
  Enquiry,
  EnquiryAssignee,
  EnquiryFilter,
  EnquiryInput,
  EnquiryMatches,
  EnquiryPatch,
  EnquiryTask,
  FollowUpBoard,
  FollowUpInput,
  MessageResult,
  TaskPatch,
} from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const enquiriesApi = Object.freeze({
  list: (params: EnquiryFilter) => data<Enquiry[]>(apiClient.get("/enquiries", { params })),
  get: (id: string) => data<Enquiry>(apiClient.get(`/enquiries/${id}`)),
  assignees: () => data<EnquiryAssignee[]>(apiClient.get("/enquiries/assignees")),
  matches: (phone: string) => data<EnquiryMatches>(apiClient.get("/enquiries/matches", { params: { phone } })),
  board: (params: { week: string; assigneeId?: string }) => data<FollowUpBoard>(apiClient.get("/enquiries/board", { params })),
  create: (body: EnquiryInput) => data<Enquiry>(apiClient.post("/enquiries", body)),
  update: (id: string, patch: EnquiryPatch) => data<Enquiry>(apiClient.patch(`/enquiries/${id}`, patch)),
  note: (id: string, body: string) => data<Enquiry>(apiClient.post(`/enquiries/${id}/notes`, { body })),
  addTask: (id: string, body: FollowUpInput) => data<EnquiryTask>(apiClient.post(`/enquiries/${id}/tasks`, body)),
  updateTask: (taskId: string, patch: TaskPatch) => data<EnquiryTask>(apiClient.patch(`/enquiries/tasks/${taskId}`, patch)),
  message: (body: { ids: string[]; message: string }) => data<MessageResult>(apiClient.post("/enquiries/message", body)),
  convert: (id: string, body: ConvertInput) => data<ConvertResult>(apiClient.post(`/enquiries/${id}/convert`, body)),
});
