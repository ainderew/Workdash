import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSocketEmit = vi.fn();
vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
  MediaTransportService: {
    getInstance: vi.fn(() => ({ socket: { emit: mockSocketEmit } })),
  },
}));

const mockRemoveVideo = vi.fn();
vi.mock("./videoChatViewer", () => ({
  VideoChatViewer: {
    getInstance: vi.fn(() => ({ removeScreenShareVideo: mockRemoveVideo })),
  },
}));

type VCServiceInternal = {
  producer: { id: string; close: () => void } | null;
  currentStream: { getTracks: () => { stop: () => void }[] } | null;
};

describe("VideoChatService.stopVideoChat()", () => {
  let VideoChatService: (typeof import("./videoChat"))["VideoChatService"];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ VideoChatService } = await import("./videoChat"));
    VideoChatService.instance = null;
  });

  it("removes the local self-view tile, since the SFU does not echo producerRemoved to us", () => {
    const service = VideoChatService.getInstance();
    const track = { stop: vi.fn() };
    const internal = service as unknown as VCServiceInternal;
    internal.producer = { id: "prod-self", close: vi.fn() };
    internal.currentStream = { getTracks: () => [track] };

    service.stopVideoChat();

    expect(mockSocketEmit).toHaveBeenCalledWith("producerClosed", {
      producerId: "prod-self",
      kind: "video",
    });
    expect(track.stop).toHaveBeenCalled();
    expect(mockRemoveVideo).toHaveBeenCalledWith("prod-self");
  });

  it("is a no-op when the camera is not on", () => {
    VideoChatService.getInstance().stopVideoChat();

    expect(mockSocketEmit).not.toHaveBeenCalled();
    expect(mockRemoveVideo).not.toHaveBeenCalled();
  });
});
