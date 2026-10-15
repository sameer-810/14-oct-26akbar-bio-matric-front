export interface Device {
  id: string;
  serial: string;
  name: string;
  location: string;
  status: "pending" | "approved" | "blocked";
  online: boolean;
  dialect: "v2" | "v3";
  dialectSource: "detected" | "manual";
  pushVersion: string | null;
  firmware: string | null;
  model: string | null;
  ipAddress: string | null;
  remoteIp: string | null;
  userCount: number | null;
  fpCount: number | null;
  attLogCount: number | null;
  lastSeenAt: string | null;
  lastHandshakeAt: string | null;
  lastPunchAt: string | null;
  punchCount: number;
  clockAheadSeconds: number | null;
  lastFuturePunchAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  quarantined: number;
  pendingCommands: number;
  failedCommands: number;
}

export type StaffCommandKind = "info" | "check" | "query_users" | "reboot" | "clear_log";

export interface DeviceCommand {
  commandId: number;
  kind: string;
  description: string;
  status: "pending" | "sent" | "done" | "failed" | "cancelled";
  attempts: number;
  sentAt: string | null;
  resultAt: string | null;
  returnCode: number | null;
  result: string | null;
  error: string | null;
  wire: string | null;
  createdAt: string;
}

export interface TrafficRow {
  at: string;
  method: string;
  path: string;
  query: string;
  ip: string;
  status: number;
  ms: number;
  body: string;
  response: string;
  note: string | null;
}
