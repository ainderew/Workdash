import { describe, it, expect, vi, beforeEach } from "vitest";
import useCallStore from "@/common/store/callStore";
import useUiStore from "@/common/store/uiStore";
import useWorldAudioStore from "@/common/store/worldAudioStore";

// ── Transport / device mocks ─────────────────────────────────────────────────

const socketHandlers: Record<string, (data: unknown) => unknown> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => unknown) => {
    socketHandlers[event] = handler;
  }),
  off: vi.fn(),
  emit: vi.fn(),
};

let producerSeq = 0;
function makeProducer() {
  producerSeq += 1;
  return {
    id: `mic-${producerSeq}`,
    closed: false,
    close: vi.fn(function (this: { closed: boolean }) {
      this.closed = true;
    }),
    pause: vi.fn(),
    resume: vi.fn(),
  };
}
const mockProduce = vi.fn(async () => makeProducer());

vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
  MediaTransportService: {
    getInstance: () => ({
      socket: mockSocket,
      reportDiagnostic: vi.fn(),
      sendTransport: { produce: mockProduce, closed: false },
    }),
  },
}));

vi.mock("@/communication/utils/emitWithTimeout", () => ({
  assertTransportReady: vi.fn(),
  emitWithTimeout: vi.fn(),
  validateNoError: vi.fn(),
  SFU_TIMEOUTS: { CONSUME: 1000, RESUME_CONSUMER: 1000 },
}));

vi.mock("./rnnoiseService", () => ({ RNNoiseService: vi.fn() }));
vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/common/utils/mediaErrors", () => ({ surfaceMediaDeviceError: vi.fn() }));
vi.mock("@/common/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGetUserMedia = vi.fn(async () => ({
  getTracks: () => [{ stop: vi.fn() }],
  getAudioTracks: () => [{ stop: vi.fn() }],
}));
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
});

type AudioChatInternal = {
  audioProducer?: ReturnType<typeof makeProducer>;
  processAudioStream: (s: unknown) => Promise<unknown>;
  resumeAudioContexts: () => Promise<void>;
  consumeProducer: (producerId: string) => Promise<void>;
  closeConsumerByProducerId: (producerId: string) => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function setMode(mode: "world" | "desk") {
  useUiStore.setState({ interactionMode: mode });
}

function enterCall(channelId = "ch-1") {
  useCallStore.getState().setCurrentCallAsOwner(channelId);
}

function emitNewProducer(data: Record<string, unknown>) {
  return socketHandlers["newProducer"]!(data) as Promise<void>;
}

describe("AudioChat world voice", () => {
  let AudioChat: (typeof import("./audioChat"))["AudioChat"];
  let audio: InstanceType<typeof AudioChat>;
  let internal: AudioChatInternal;

  beforeEach(async () => {
    vi.clearAllMocks();
    useCallStore.getState().reset();
    setMode("world");

    ({ AudioChat } = await import("./audioChat"));
    AudioChat.instance = null;
    audio = AudioChat.getInstance();
    internal = audio as unknown as AudioChatInternal;
    vi.spyOn(internal, "processAudioStream").mockImplementation(async (s) => s);
    vi.spyOn(internal, "resumeAudioContexts").mockResolvedValue(undefined);

    await audio.watchNewProducers();
  });

  // ── Opening the mic ────────────────────────────────────────────────────

  describe("joinVoiceChat()", () => {
    it("opens a world mic, muted, in world mode outside a call", async () => {
      await audio.joinVoiceChat();

      expect(mockProduce).toHaveBeenCalledTimes(1);
      expect(audio.getAudioProducer()).toBeDefined();
      expect(audio.isMuted).toBe(true);
    });

    it("never opens a mic in desk mode outside a call", async () => {
      setMode("desk");

      await audio.joinVoiceChat();

      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(audio.getAudioProducer()).toBeUndefined();
    });

    it("opens a call mic for the owning tab, as before", async () => {
      setMode("desk");
      enterCall();

      await audio.joinVoiceChat();

      expect(mockProduce).toHaveBeenCalledTimes(1);
    });

    it("does nothing in a tab that does not own the call, as before", async () => {
      useCallStore.getState().setCallOwnershipStatus("ch-1", "passive");

      await audio.joinVoiceChat();

      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it("replaces a world mic with a fresh call mic when a call starts", async () => {
      await audio.joinVoiceChat();
      const worldMic = audio.getAudioProducer()!;

      enterCall();
      await audio.joinVoiceChat();

      expect(mockSocket.emit).toHaveBeenCalledWith("producerClosed", {
        producerId: worldMic.id,
        kind: "audio",
      });
      expect(audio.getAudioProducer()?.id).not.toBe(worldMic.id);
      expect(mockProduce).toHaveBeenCalledTimes(2);
    });
  });

  // ── Hearing others ─────────────────────────────────────────────────────

  describe("newProducer routing", () => {
    beforeEach(() => {
      vi.spyOn(internal, "consumeProducer").mockResolvedValue(undefined);
    });

    const zoneVoice = { producerId: "zone-mic", source: "microphone", userId: 7, scope: "zone" };

    it("plays zone voices in world mode outside a call", async () => {
      await emitNewProducer(zoneVoice);
      expect(internal.consumeProducer).toHaveBeenCalledWith("zone-mic");
    });

    it("ignores zone voices in desk mode", async () => {
      setMode("desk");
      await emitNewProducer(zoneVoice);
      expect(internal.consumeProducer).not.toHaveBeenCalled();
    });

    it("ignores zone voices while in a call", async () => {
      enterCall();
      await emitNewProducer(zoneVoice);
      expect(internal.consumeProducer).not.toHaveBeenCalled();
    });

    it("plays call audio for the owning tab, as before", async () => {
      enterCall();
      await emitNewProducer({ producerId: "call-mic", source: "microphone", scope: "call" });
      expect(internal.consumeProducer).toHaveBeenCalledWith("call-mic");
    });
  });

  // ── Leaving world voice ────────────────────────────────────────────────

  describe("zone transitions", () => {
    it("reports server-confirmed membership to the area indicator without counting duplicate or stale arrivals", async () => {
      audio.initializeAudioChat(vi.fn());
      await socketHandlers["zone-players"]!({ zone: "outdoors", players: [{ socketId: "peer", playerId: 2, name: "Peer", producerIds: [] }] });
      await socketHandlers["player-joined-zone"]!({ zone: "outdoors", socketId: "peer", producerIds: [] });
      await socketHandlers["player-joined-zone"]!({ zone: "main_office", socketId: "stale", producerIds: [] });
      expect(useWorldAudioStore.getState()).toMatchObject({ connected: true, zoneId: "outdoors", peerIds: ["peer"] });
      await socketHandlers["player-left-zone"]!({ zone: "outdoors", socketId: "peer" });
      expect(useWorldAudioStore.getState().peerIds).toEqual([]);
    });
    it("releases office audio before subscribing outdoors and can return to the office", async () => {
      audio.initializeAudioChat(vi.fn());
      const order: string[] = [];
      vi.spyOn(audio, "closeAllAudioConsumers").mockImplementation(() => { order.push("close"); });
      vi.spyOn(internal, "consumeProducer").mockImplementation(async (id) => { order.push(id); });
      const enter = (zone: string, id: string) => socketHandlers["zone-players"]!({ zone, players: [{ socketId: "peer", playerId: 2, name: "Peer", producerIds: [id] }] });
      await enter("main_office", "office-mic");
      await enter("outdoors", "outdoor-mic");
      await enter("main_office", "office-mic");
      expect(order).toEqual(["close", "office-mic", "close", "outdoor-mic", "close", "office-mic"]);
    });

    it("leaves call audio alone when the world zone changes", async () => {
      audio.initializeAudioChat(vi.fn());
      enterCall();
      const close = vi.spyOn(audio, "closeAllAudioConsumers");
      await socketHandlers["zone-players"]!({ zone: "outdoors", players: [] });
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe("stopWorldVoice()", () => {
    it("releases a world mic and stops zone voices", async () => {
      vi.spyOn(internal, "consumeProducer").mockResolvedValue(undefined);
      const closeSpy = vi.spyOn(internal, "closeConsumerByProducerId");
      await audio.joinVoiceChat();
      await emitNewProducer({ producerId: "zone-mic", source: "microphone", scope: "zone" });

      audio.stopWorldVoice();

      expect(audio.getAudioProducer()).toBeUndefined();
      expect(closeSpy).toHaveBeenCalledWith("zone-mic");
      expect(useUiStore.getState().isMuted).toBe(true);
    });

    it("leaves a call mic alone", async () => {
      enterCall();
      await audio.joinVoiceChat();
      const callMic = audio.getAudioProducer();

      audio.stopWorldVoice();

      expect(audio.getAudioProducer()).toBe(callMic);
      expect(mockSocket.emit).not.toHaveBeenCalledWith("producerClosed", expect.anything());
    });
  });

  describe("stopMic()", () => {
    it("shows the mic as muted once it is released (e.g. after leaving a call)", async () => {
      enterCall();
      await audio.joinVoiceChat();
      await audio.unMuteMic();
      expect(useUiStore.getState().isMuted).toBe(false);

      audio.stopMic();

      expect(useUiStore.getState().isMuted).toBe(true);
      expect(audio.isMuted).toBe(true);
    });
  });

  // ── Device selection ───────────────────────────────────────────────────

  describe("switchMicrophone()", () => {
    it("only remembers the device when no mic is open, and uses it next time", async () => {
      await audio.switchMicrophone("usb-mic");
      expect(mockGetUserMedia).not.toHaveBeenCalled();

      await audio.joinVoiceChat();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({ deviceId: { exact: "usb-mic" } }),
      });
    });
  });
  it("mutes a stable guest identity without muting an account or another guest", () => {
    const state = audio as unknown as {
      audioProducerUserIdMap: Map<string, number | string>;
      producerToConsumerMap: Map<string, string>;
      gainNodes: Map<string, { gain: { value: number } }>;
    };
    const guestGain = { gain: { value: 1 } }; const accountGain = { gain: { value: 1 } };
    state.audioProducerUserIdMap.set('guest-mic', 'guest:alice');
    state.audioProducerUserIdMap.set('account-mic', 12);
    state.producerToConsumerMap.set('guest-mic', 'guest-consumer');
    state.producerToConsumerMap.set('account-mic', 'account-consumer');
    state.gainNodes.set('guest-consumer', guestGain); state.gainNodes.set('account-consumer', accountGain);
    audio.setGuestMuted('guest:alice', true);
    expect(guestGain.gain.value).toBe(0); expect(accountGain.gain.value).toBe(1);
    audio.setGuestMuted('guest:alice', false); expect(guestGain.gain.value).toBe(1);
  });

});
