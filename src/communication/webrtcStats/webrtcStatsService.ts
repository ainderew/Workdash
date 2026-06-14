import { MediaTransportService } from '../mediaTransportService/mediaTransportService';
import useCallStore from '@/common/store/callStore';
import type { ConnectionQuality, StatsSnapshot } from '@/common/store/callStore';
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
  private prevTimestamp = 0;
  private qualityHoldStart = 0;
  private lastQuality: ConnectionQuality = 'unknown';
  private polling = false;
  private unsubscribe: (() => void) | null = null;

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
    this.prevTimestamp = 0;
    this.qualityHoldStart = 0;
    this.lastQuality = 'unknown';
    useCallStore.getState().setConnectionQuality('unknown');
    useCallStore.getState().setStatsSnapshot(null);

    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    useCallStore.getState().setConnectionQuality('unknown');
    useCallStore.getState().setStatsSnapshot(null);
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
            totalBytesReceived += report.bytesReceived ?? 0;
            totalPacketsLost += report.packetsLost ?? 0;
            totalPacketsReceived += report.packetsReceived ?? 0;
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
    const deltaPacketsTotal = deltaPacketsReceived + deltaPacketsLost;

    this.prevBytesSent = totalBytesSent;
    this.prevBytesReceived = totalBytesReceived;
    this.prevPacketsLost = totalPacketsLost;
    this.prevPacketsReceived = totalPacketsReceived;
    this.prevTimestamp = timestamp;

    const packetLoss = deltaPacketsTotal > 0
      ? (deltaPacketsLost / deltaPacketsTotal) * 100
      : 0;

    const rttMs = rtt * 1000;

    const snapshot: StatsSnapshot = {
      bitrate: Math.round(bitrate),
      packetLoss: Math.round(packetLoss * 10) / 10,
      rtt: Math.round(rttMs),
      fps: Math.round(fps),
    };

    // Determine quality
    let quality: ConnectionQuality;
    if (rttMs < 150 && packetLoss < 2) {
      quality = 'good';
    } else if (rttMs < 300 && packetLoss < 5) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }

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

        // Adaptive layer selection
        this.requestAdaptiveLayers(quality, sfu);
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
    } finally {
      this.polling = false;
    }
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
