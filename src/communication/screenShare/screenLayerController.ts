import useCallStore from "@/common/store/callStore";
import type { ConnectionQuality } from "@/common/store/callStore";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";

/**
 * Automatic screen-share quality.
 *
 * The screen producer carries two simulcast spatial layers (see screenShare.ts):
 * index 0 = downscaled thumbnail layer, index 1 = full-resolution layer. This
 * controller asks the SFU to send each viewer the layer that matches how large
 * the screen is *actually rendered* on their display — big tile → full-res,
 * small thumbnail → cheap layer — so quality "just works" with no pinning or
 * badges. A weak connection caps every screen to the thumbnail layer to keep the
 * call smooth (surfaced to the user via the tile's connection warning).
 *
 * Tiles report their rendered width here; the controller picks the layer.
 */

/** Index of the downscaled thumbnail layer in the screen producer's encodings. */
export const SCREEN_LOW_LAYER = 0;
/** Index of the full-resolution layer. */
export const SCREEN_HIGH_LAYER = 1;

/**
 * Rendered CSS width (px) at/above which the full-res layer is worth it. Below
 * this the downscaled (~540p) layer is indistinguishable, so we save bandwidth.
 */
export const HD_MIN_WIDTH = 480;

/** Highest spatial layer we'll request for a screen at a given link quality. */
export function screenQualityCeiling(quality: ConnectionQuality): number {
  return quality === "poor" ? SCREEN_LOW_LAYER : SCREEN_HIGH_LAYER;
}

/** Desired layer for a tile of the given rendered width, capped by link quality. */
export function computeScreenLayerForWidth(
  width: number,
  quality: ConnectionQuality,
): number {
  const desired = width >= HD_MIN_WIDTH ? SCREEN_HIGH_LAYER : SCREEN_LOW_LAYER;
  return Math.min(desired, screenQualityCeiling(quality));
}

/** tileId → { producerId, width } for every mounted screen tile. */
const tileSizes = new Map<string, { producerId: string; width: number }>();
/** consumerId → last layer we emitted, so we don't spam the socket. */
const lastAppliedLayer = new Map<string, number>();

/** Largest rendered width across all mounted tiles showing this producer. */
function maxWidthForProducer(producerId: string): number {
  let max = 0;
  for (const entry of tileSizes.values()) {
    if (entry.producerId === producerId) max = Math.max(max, entry.width);
  }
  return max;
}

function applyForProducer(producerId: string): void {
  const sfu = MediaTransportService.getInstance();
  if (!sfu.recvTransport || sfu.recvTransport.closed) return;

  const { producerToConsumerMap, connectionQuality } = useCallStore.getState();
  const consumerId = producerToConsumerMap[producerId];
  if (!consumerId) return;

  const spatialLayer = computeScreenLayerForWidth(
    maxWidthForProducer(producerId),
    connectionQuality,
  );
  if (lastAppliedLayer.get(consumerId) === spatialLayer) return;

  lastAppliedLayer.set(consumerId, spatialLayer);
  sfu.socket.emit(
    "setConsumerPreferredLayers",
    { consumerId, spatialLayer },
    () => {},
  );
}

/** A screen tile reports its rendered width (call on mount + on resize). */
export function reportScreenTileSize(
  tileId: string,
  producerId: string,
  width: number,
): void {
  tileSizes.set(tileId, { producerId, width });
  applyForProducer(producerId);
}

/** A screen tile unmounted — forget it and re-evaluate its producer. */
export function clearScreenTileSize(tileId: string): void {
  const entry = tileSizes.get(tileId);
  tileSizes.delete(tileId);
  if (entry) applyForProducer(entry.producerId);
}

/** Re-apply every known screen tile (e.g. when connection quality changes). */
export function applyScreenShareLayers(): void {
  const producerIds = new Set<string>();
  for (const { producerId } of tileSizes.values()) producerIds.add(producerId);
  for (const producerId of producerIds) applyForProducer(producerId);

  // Drop cache entries for consumers that have gone away.
  const liveConsumers = new Set(
    Object.values(useCallStore.getState().producerToConsumerMap),
  );
  for (const consumerId of lastAppliedLayer.keys()) {
    if (!liveConsumers.has(consumerId)) lastAppliedLayer.delete(consumerId);
  }
}

let unsubscribe: (() => void) | null = null;

/**
 * Re-apply screen layers whenever the connection-quality signal changes (tile
 * resizes drive the rest directly). Wired to the WebrtcStatsService lifecycle.
 */
export function startScreenLayerController(): void {
  if (unsubscribe) return;
  let prevQuality = useCallStore.getState().connectionQuality;
  unsubscribe = useCallStore.subscribe((state) => {
    if (state.connectionQuality === prevQuality) return;
    prevQuality = state.connectionQuality;
    applyScreenShareLayers();
  });
}

export function stopScreenLayerController(): void {
  unsubscribe?.();
  unsubscribe = null;
  tileSizes.clear();
  lastAppliedLayer.clear();
}
