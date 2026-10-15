import { apiClient } from "@api/apiClient";
import type { SharedDocument, DocumentLink, ShareInput } from "../types";

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

/** The multipart body the server expects: lists as JSON text, booleans as "true"/"false", the file last. */
function shareForm(input: ShareInput) {
  const form = new FormData();
  form.append("title", input.title);
  if (input.description) form.append("description", input.description);
  form.append("batchIds", JSON.stringify(input.batchIds));
  form.append("notify", input.notify ? "true" : "false");
  const f = input.file;
  if (f.file) form.append("file", f.file, f.name);
  // React Native's FormData takes a { uri, name, type } descriptor in place of a Blob
  else form.append("file", { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  return form;
}

export const documentsApi = Object.freeze({
  list: () => data<SharedDocument[]>(apiClient.get("/documents")),
  // the client's default JSON Content-Type would make axios serialise the FormData;
  // multipart lets it through, and axios then leaves the boundary to the platform
  share: (input: ShareInput) =>
    data<SharedDocument>(
      apiClient.post("/documents", shareForm(input), { headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000 }),
    ),
  link: (id: string) => data<DocumentLink>(apiClient.get(`/documents/${id}/link`)),
  remove: (id: string) => data<SharedDocument>(apiClient.delete(`/documents/${id}`)),
});
