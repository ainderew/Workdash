type CallOwnershipMessage =
  | { type: "call-claimed"; channelId: string; tabId: string }
  | { type: "call-released"; channelId: string; tabId: string }
  | { type: "call-lost"; channelId: string; tabId: string }
  | { type: "transfer-initiated"; channelId: string; tabId: string };

let channel: BroadcastChannel | null = null;
const TAB_ID = crypto.randomUUID();

export function initCallOwnershipChannel(
  onMessage: (msg: CallOwnershipMessage) => void,
): void {
  if (typeof BroadcastChannel === "undefined") return;
  channel?.close();
  channel = new BroadcastChannel("workdash:call-ownership");
  channel.onmessage = (event: MessageEvent<CallOwnershipMessage>) => {
    onMessage(event.data);
  };
}

export function broadcastCallOwnership(
  type: CallOwnershipMessage["type"],
  channelId: string,
): void {
  channel?.postMessage({ type, channelId, tabId: TAB_ID } as CallOwnershipMessage);
}

export function destroyCallOwnershipChannel(): void {
  channel?.close();
  channel = null;
}

export function getTabId(): string {
  return TAB_ID;
}
