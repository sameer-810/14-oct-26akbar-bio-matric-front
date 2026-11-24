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
  adoption: {
    families: number;
    signedIn: number;
    withPush: number;
    /** parents who can be sent an alert: an active login with a child still at the academy */
    eligible: number;
    /** of those, parents an app alert really reached (the push receipt came back clean) */
    notified: number;
    /** parents whose app alert is sent but not yet confirmed (about 15 minutes) */
    awaiting: number;
  };
  fallback: "sms" | "whatsapp" | "none";
  sms: boolean;
  whatsapp: boolean;
}
