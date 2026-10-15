/** Who a notice or a shared document is for: no batches named means everyone. */
export interface Audience {
  batchIds: string[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  batchIds: string[];
  batchNames?: string[];
  studentIds: string[];
  everyone: boolean;
  pinned: boolean;
  /** the last day it shows (YYYY-MM-DD); null = until removed */
  expiresOn: string | null;
  notifiedAt: string | null;
  familiesTold: number;
  createdAt: string;
}

export interface NoticeInput {
  title: string;
  body?: string;
  batchIds?: string[];
  studentIds?: string[];
  pinned?: boolean;
  expiresOn?: string | null;
  /** also send it to the families' phones */
  notify?: boolean;
}

export type NoticePatch = Partial<Omit<NoticeInput, "notify">>;
