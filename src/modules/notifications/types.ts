export type AlertStatus = "queued" | "sending" | "sent" | "failed" | "no_device" | "expired";
export type AlertType = "entry" | "exit" | "absent" | "leave" | "notice" | "message";

export interface AlertLogRow {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  student: { id: string; name: string; grNumber: string } | null;
  parentUsername: string | null;
  status: AlertStatus;
  channel: "push" | "sms" | "whatsapp" | "none" | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  read: boolean;
}

export interface AlertLog {
  items: AlertLogRow[];
  total: number;
  page: number;
  pages: number;
}

export interface AlertReach {
  adoption: { families: number; signedIn: number; withPush: number };
  fallback: "sms" | "whatsapp" | "none";
  sms: boolean;
  whatsapp: boolean;
}
