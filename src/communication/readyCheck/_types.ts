export type ReadyCheckResponseState =
  | "ready"
  | "not-ready"
  | "focused"
  | "pending";

export type ReadyCheckResolvedReason =
  | "all-responded"
  | "timeout"
  | "cancelled"
  | "call-ended";

export interface ReadyCheckTarget {
  userId: number;
  displayName: string;
  state: ReadyCheckResponseState;
  respondedAt: string | null;
}

export interface ReadyCheckSnapshot {
  checkId: string;
  channelId: string;
  invokerUserId: number;
  invokerDisplayName: string;
  startedAt: string;
  expiresAt: string;
  timeoutMs: number;
  targets: ReadyCheckTarget[];
  resolved: boolean;
  resolvedReason: ReadyCheckResolvedReason | null;
}

export interface ReadyCheckPromptPayload {
  checkId: string;
  channelId: string;
  invokerDisplayName: string;
  expiresAt: string;
}
