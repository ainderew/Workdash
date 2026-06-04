/** Socket.io event names for ready-check — keep in sync with backend ready-check-events.ts */
export const ReadyCheckEvents = {
  ACTIVE: "ready-check:active",
  RESOLVED: "ready-check:resolved",
  PROMPT: "ready-check:prompt",
  RESPOND: "ready-check:respond",
  CANCEL: "ready-check:cancel",
  GET_ACTIVE: "ready-check:get-active",
} as const;

export type ReadyCheckEvent =
  (typeof ReadyCheckEvents)[keyof typeof ReadyCheckEvents];
