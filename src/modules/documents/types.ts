/** A worksheet, notes or a circular shared with families. Not the DOM's Document. */
export interface SharedDocument {
  id: string;
  title: string;
  description: string;
  batchIds: string[];
  batchNames?: string[];
  studentIds: string[];
  everyone: boolean;
  fileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  size: number;
  familiesTold: number;
  createdAt: string;
}

/** A signed link that opens the file for a few minutes with no sign-in. */
export interface DocumentLink {
  url: string;
  expiresInMinutes: number;
}

/** The file chosen for upload: a browser File on web, a cached uri on a phone. */
export interface PickedFile {
  name: string;
  size: number;
  type: string;
  file?: File;
  uri?: string;
}

export interface ShareInput {
  title: string;
  description?: string;
  batchIds: string[];
  notify: boolean;
  file: PickedFile;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
