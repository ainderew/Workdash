/** Socket.io event names for SFU transport — keep in sync with backend call-events.ts */
export const SfuEvents = {
  PRODUCER_REMOVED: "producerRemoved",
  NEW_PRODUCER: "newProducer",
  SFU_INITIALIZED: "sfuInitialized",
  SFU_RESET: "sfuReset",
} as const;

export type SfuEvent = (typeof SfuEvents)[keyof typeof SfuEvents];
