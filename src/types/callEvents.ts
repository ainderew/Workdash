/** Socket.io event names for call signaling — keep in sync with backend call-events.ts */
export const CallEvents = {
  // Broadcast events (server → clients)
  STARTED: "call:started",
  ENDED: "call:ended",
  PARTICIPANT_JOINED: "call:participant_joined",
  PARTICIPANT_LEFT: "call:participant_left",
  MEDIA_CHANGED: "call:media_changed",
  OWNERSHIP_CHANGED: "call:ownership-changed",
  OWNERSHIP_LOST: "call:ownership-lost",
  OWNERSHIP_CLEARED: "call:ownership-cleared",
  WORKSPACE_CALL_ACTIVE: "workspace:call:active",
  DM_CALL_ACTIVE: "dm:call:active",

  // RPC events (client → server with ack)
  START: "call:start",
  JOIN: "call:join",
  LEAVE: "call:leave",
  GET_STATE: "call:get-state",
  SET_MEDIA: "call:set-media",
  GET_ACTIVE: "call:get-active",
  GET_ACTIVE_FOR_WORKSPACES: "call:get-active-for-workspaces",
  TRANSFER_REQUEST: "call:transfer-request",

  // Session management
  SESSION_REGISTER: "session:register",
} as const;

export type CallEvent = (typeof CallEvents)[keyof typeof CallEvents];
