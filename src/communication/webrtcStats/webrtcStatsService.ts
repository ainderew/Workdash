import { MediaTransportService } from '../mediaTransportService/mediaTransportService';
import useCallStore from '@/common/store/callStore';
import type { ConnectionQuality, StatsSnapshot } from '@/common/store/callStore';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import { AudioChat } from '@/communication/audioChat/audioChat';
import {
  classifyQuality,
  lossPercent,
  worseQuality,
} from './webrtcStatsUtils';
import {
  startScreenLayerController,
  stopScreenLayerController,
} from '@/communication/screenShare/screenLayerController';

const POLL_INTERVAL_MS = 2_000;
const QUALITY_HOLD_MS = 4_000;

export class WebrtcStatsService {
  private static instance: WebrtcStatsService | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private prevBytesSent = 0;
  private prevBytesReceived = 0;
  private prevPacketsLost = 0;
  private prevPacketsReceived = 0;
  private prevAudioPacketsLost = 0;
  private prevAudioPacketsReceived = 0;
  private prevVideoPacketsLost = 0;
  private prevVideoPacketsReceived = 0;
  private prevTimestamp = 0;
  private qualityHoldStart = 0;
  private lastQuality: ConnectionQuality = 'unknown';
  private polling = false;
  private unsubscribe: (() => void) | null = null;

  // Per-consumer cumulative packet counters (keyed by producerId) for deltas
  private prevConsumerLost = new Map<string, number>();
  private prevConsumerReceived = new Map<string, number>();

  static getInstance(): WebrtcStatsService {
    if (!this.instance) {
      this.instance = new WebrtcStatsService();
    }
    return this.instance;
  }

  start(): void {
    // Fix #4: guard on unsubscribe to prevent leaked subscriptions
    if (this.unsubscribe) return;

    // Screen-share quality boost reacts to focus/quality changes via its own
    // callStore subscription; share this service's start/stop lifecycle.
    startScreenLayerController();

    // Watch callStore — only react to currentCall changes (not quality/stats updates)
    let prevInCall = !!useCallStore.getState().currentCall;
    this.unsubscribe = useCallStore.subscribe((state) => {
      const inCall = !!state.currentCall;
      if (inCall === prevInCall) return;
      prevInCall = inCall;
      if (inCall && !this.intervalId) {
        this.startPolling();
      } else if (!inCall && this.intervalId) {
        this.stopPolling();
      }
    });

    // If already in a call, start immediately
    if (useCallStore.getState().currentCall) {
      this.startPolling();
    }
  }

  stop(): void {
    this.stopPolling();
    this.unsubscribe?.();
    this.unsubscribe = null;
    stopScreenLayerController();
  }

  private startPolling(): void {
    if (this.intervalId) return;
    this.prevBytesSent = 0;
    this.prevBytesReceived = 0;
    this.prevPacketsLost = 0;
    this.prevPacketsReceived = 0;
    this.prevAudioPacketsLost = 0;
    this.prevAudioPacketsReceived = 0;
    this.prevVideoPacketsLost = 0;
    this.prevVideoPacketsReceived = 0;
    this.prevTimestamp = 0;
    this.qualityHoldStart = 0;
    this.lastQuality = 'unknown';
    this.prevConsumerLost.clear();
    this.prevConsumerReceived.clear();
    useCallStore.getState().setConnectionQuality('unknown');
    useCallStore.getState().setStatsSnapshot(null);
    useCallStore.getState().setParticipantQuality({});

    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.prevConsumerLost.clear();
    this.prevConsumerReceived.clear();
    useCallStore.getState().setConnectionQuality('unknown');
    useCallStore.getState().setStatsSnapshot(null);
    useCallStore.getState().setParticipantQuality({});
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;

    try {
    const sfu = MediaTransportService.getInstance();
    const sendTransport = sfu.sendTransport;
    const recvTransport = sfu.recvTransport;

    if (!sendTransport && !recvTransport) return;

    let totalBytesSent = 0;
    let totalBytesReceived = 0;
    let totalPacketsLost = 0;
    let totalPacketsReceived = 0;
    let audioPacketsLost = 0;
    let audioPacketsReceived = 0;
    let videoPacketsLost = 0;
    let videoPacketsReceived = 0;
    let rtt = 0;
    let fps = 0;
    const timestamp = performance.now();

    try {
      if (sendTransport && !sendTransport.closed) {
        const stats = await sendTransport.getStats();
        for (const report of stats.values()) {
          if (report.type === 'outbound-rtp') {
            totalBytesSent += report.bytesSent ?? 0;
            if (report.framesPerSecond) {
              fps = Math.max(fps, report.framesPerSecond);
            }
          }
          if (report.type === 'candidate-pair' && report.nominated) {
            rtt = report.currentRoundTripTime ?? rtt;
          }
        }
      }

      if (recvTransport && !recvTransport.closed) {
        const stats = await recvTransport.getStats();
        for (const report of stats.values()) {
          if (report.type === 'inbound-rtp') {
            const lost = report.packetsLost ?? 0;
            const received = report.packetsReceived ?? 0;
            totalBytesReceived += report.bytesReceived ?? 0;
            totalPacketsLost += lost;
            totalPacketsReceived += received;
            // `kind` ('audio' | 'video') lets us break out choppy audio that
            // the video-dominated combined number would otherwise hide.
            const kind = report.kind ?? report.mediaType;
            if (kind === 'audio') {
              audioPacketsLost += lost;
              audioPacketsReceived += received;
            } else if (kind === 'video') {
              videoPacketsLost += lost;
              videoPacketsReceived += received;
            }
            if (report.framesPerSecond) {
              fps = Math.max(fps, report.framesPerSecond);
            }
          }
          if (report.type === 'candidate-pair' && report.nominated) {
            rtt = report.currentRoundTripTime ?? rtt;
          }
        }
      }
    } catch {
      return;
    }

    // Compute deltas
    const elapsed = this.prevTimestamp > 0
      ? (timestamp - this.prevTimestamp) / 1000
      : 0;

    let bitrate = 0;
    if (elapsed > 0 && this.prevTimestamp > 0) {
      const deltaBytes =
        (totalBytesSent - this.prevBytesSent) +
        (totalBytesReceived - this.prevBytesReceived);
      bitrate = Math.max(0, (deltaBytes * 8) / elapsed);
    }

    // Fix #3: compute packet loss from per-interval deltas, not cumulative totals
    const deltaPacketsLost = Math.max(0, totalPacketsLost - this.prevPacketsLost);
    const deltaPacketsReceived = Math.max(0, totalPacketsReceived - this.prevPacketsReceived);

    // Slice C: audio and video loss are tracked separately so a healthy video
    // stream can no longer mask an unusable audio stream (or vice versa).
    const deltaAudioLost = Math.max(0, audioPacketsLost - this.prevAudioPacketsLost);
    const deltaAudioReceived = Math.max(0, audioPacketsReceived - this.prevAudioPacketsReceived);
    const deltaVideoLost = Math.max(0, videoPacketsLost - this.prevVideoPacketsLost);
    const deltaVideoReceived = Math.max(0, videoPacketsReceived - this.prevVideoPacketsReceived);

    this.prevBytesSent = totalBytesSent;
    this.prevBytesReceived = totalBytesReceived;
    this.prevPacketsLost = totalPacketsLost;
    this.prevPacketsReceived = totalPacketsReceived;
    this.prevAudioPacketsLost = audioPacketsLost;
    this.prevAudioPacketsReceived = audioPacketsReceived;
    this.prevVideoPacketsLost = videoPacketsLost;
    this.prevVideoPacketsReceived = videoPacketsReceived;
    this.prevTimestamp = timestamp;

    const packetLoss = lossPercent(deltaPacketsLost, deltaPacketsReceived);
    const audioLoss = lossPercent(deltaAudioLost, deltaAudioReceived);
    const videoLoss = lossPercent(deltaVideoLost, deltaVideoReceived);

    const rttMs = rtt * 1000;

    const snapshot: StatsSnapshot = {
      bitrate: Math.round(bitrate),
      packetLoss: Math.round(packetLoss * 10) / 10,
      audioPacketLoss: Math.round(audioLoss * 10) / 10,
      videoPacketLoss: Math.round(videoLoss * 10) / 10,
      rtt: Math.round(rttMs),
      fps: Math.round(fps),
    };

    // Overall = the worse of the two streams; the dot must reflect bad audio.
    const audioQuality = classifyQuality(rttMs, audioLoss);
    const videoQuality = classifyQuality(rttMs, videoLoss);
    const quality = worseQuality(audioQuality, videoQuality);

    // Fix #7: use performance.now() consistently for hold timer
    const now = performance.now();
    if (quality !== this.lastQuality) {
      if (this.qualityHoldStart === 0) {
        this.qualityHoldStart = now;
      }
      if (now - this.qualityHoldStart >= QUALITY_HOLD_MS) {
        this.lastQuality = quality;
        this.qualityHoldStart = 0;
        useCallStore.getState().setConnectionQuality(quality);

        // Adaptive layers follow VIDEO health only — don't downscale video
        // resolution just because audio is lossy.
        this.requestAdaptiveLayers(videoQuality, sfu);
      }
    } else {
      this.qualityHoldStart = 0;
    }

    // First poll — set immediately
    if (useCallStore.getState().connectionQuality === 'unknown') {
      this.lastQuality = quality;
      // Fix #8: reset hold start so first real transition gets full 4s hold
      this.qualityHoldStart = 0;
      useCallStore.getState().setConnectionQuality(quality);
    }

    useCallStore.getState().setStatsSnapshot(snapshot);

    await this.pollParticipantQuality();
    } finally {
      this.polling = false;
    }
  }

  /**
   * Per-participant quality from each remote consumer's own getStats(). The
   * aggregate dot can't tell you *which* peer is choppy — this powers the
   * per-tile badge so a single bad uplink is attributable.
   */
  private async pollParticipantQuality(): Promise<void> {
    const producerUserMap = useCallStore.getState().producerUserMap;

    const entries: Array<{
      producerId: string;
      userId: number | undefined;
      getStats: () => Promise<RTCStatsReport>;
    }> = [
      ...VideoChatViewer.getInstance().getRemoteConsumerEntries().map((e) => ({
        producerId: e.producerId,
        userId: producerUserMap[e.producerId],
        getStats: () => e.consumer.getStats(),
      })),
      ...AudioChat.getInstance().getRemoteConsumerEntries().map((e) => ({
        producerId: e.producerId,
        userId: e.userId,
        getStats: () => e.consumer.getStats(),
      })),
    ];

    const seen = new Set<string>();
    const worstByUser = new Map<number, ConnectionQuality>();

    await Promise.all(
      entries.map(async ({ producerId, userId, getStats }) => {
        seen.add(producerId);
        try {
          const quality = await this.consumerQuality(producerId, getStats);
          if (quality && userId !== undefined) {
            worstByUser.set(userId, worseQuality(worstByUser.get(userId), quality));
          }
        } catch {
          // Ignore stats failures for an individual consumer
        }
      }),
    );

    // Forget counters for consumers that have gone away
    for (const id of Array.from(this.prevConsumerLost.keys())) {
      if (!seen.has(id)) {
        this.prevConsumerLost.delete(id);
        this.prevConsumerReceived.delete(id);
      }
    }

    const result: Record<number, ConnectionQuality> = {};
    for (const [userId, quality] of worstByUser) {
      result[userId] = quality;
    }
    useCallStore.getState().setParticipantQuality(result);
  }

  /** Loss-based quality for one consumer, from per-interval packet deltas. */
  private async consumerQuality(
    producerId: string,
    getStats: () => Promise<RTCStatsReport>,
  ): Promise<ConnectionQuality | null> {
    const stats = await getStats();
    let lost = 0;
    let received = 0;
    for (const report of stats.values()) {
      if (report.type === 'inbound-rtp') {
        lost += report.packetsLost ?? 0;
        received += report.packetsReceived ?? 0;
      }
    }

    const prevLost = this.prevConsumerLost.get(producerId) ?? lost;
    const prevReceived = this.prevConsumerReceived.get(producerId) ?? received;
    this.prevConsumerLost.set(producerId, lost);
    this.prevConsumerReceived.set(producerId, received);

    const deltaLost = Math.max(0, lost - prevLost);
    const deltaReceived = Math.max(0, received - prevReceived);
    const total = deltaLost + deltaReceived;
    if (total === 0) return null; // no traffic this interval — leave as-is

    const loss = (deltaLost / total) * 100;
    if (loss < 2) return 'good';
    if (loss < 5) return 'fair';
    return 'poor';
  }

  private requestAdaptiveLayers(
    quality: ConnectionQuality,
    sfu: MediaTransportService,
  ): void {
    const spatialLayer = quality === 'poor' ? 0 : quality === 'fair' ? 1 : 2;

    // Request layer change for all active video consumers via socket
    if (!sfu.recvTransport || sfu.recvTransport.closed) return;

    const { producerToConsumerMap, screenProducerUserMap } = useCallStore.getState();
    // Only target camera-video consumers — skip screen-share consumers
    for (const [producerId, consumerId] of Object.entries(producerToConsumerMap)) {
      if (producerId in screenProducerUserMap) continue;
      sfu.socket.emit(
        'setConsumerPreferredLayers',
        { consumerId, spatialLayer },
        () => {},
      );
    }
  }
}
