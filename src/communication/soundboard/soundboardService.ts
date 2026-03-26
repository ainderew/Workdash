import type { Producer } from 'mediasoup-client/types';
import { MediaTransportService } from '@/communication/mediaTransportService/mediaTransportService';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '@/common/components/Soundboard/_types';

const MAX_CACHE_ENTRIES = 10;

export class SoundboardService {
  private static instance: SoundboardService | null = null;
  private audioContext: AudioContext | null = null;
  private currentProducer: Producer | null = null;
  private isProducing = false;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  private constructor() {}

  static getInstance(): SoundboardService {
    if (!SoundboardService.instance) {
      SoundboardService.instance = new SoundboardService();
    }
    return SoundboardService.instance;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private async fetchAudioBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.audioBufferCache.get(url);
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = this.getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    if (this.audioBufferCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.audioBufferCache.keys().next().value;
      if (oldest) this.audioBufferCache.delete(oldest);
    }
    this.audioBufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  async playSound(sound: SoundboardSound): Promise<void> {
    const store = useSoundboardStore.getState();
    if (!store.canPlay() || this.isProducing) return;

    this.isProducing = true;
    store.setIsPlaying(true);

    try {
      const audioBuffer = await this.fetchAudioBuffer(sound.audioUrl);
      const ctx = this.getAudioContext();

      // Create audio graph: source → destination (MediaStream)
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const destination = ctx.createMediaStreamDestination();
      source.connect(destination);

      const [track] = destination.stream.getAudioTracks();

      // Produce ephemeral audio track via mediasoup
      const sfuService = MediaTransportService.getInstance();
      if (!sfuService.sendTransport) {
        throw new Error('No send transport available');
      }

      this.currentProducer = await sfuService.sendTransport.produce({
        track,
        appData: { source: 'soundboard', soundName: sound.name },
      });

      // Stamp cooldown only after successful produce
      store.setLastPlayedAt(Date.now());

      // Clean up when sound ends
      source.onended = () => {
        this.closeCurrentProducer();
        this.isProducing = false;
        track.stop();
        useSoundboardStore.getState().setIsPlaying(false);
      };

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      source.start(0);
    } catch (err) {
      this.closeCurrentProducer();
      this.isProducing = false;
      useSoundboardStore.getState().setIsPlaying(false);
      throw err;
    }
  }

  private closeCurrentProducer() {
    if (this.currentProducer && !this.currentProducer.closed) {
      this.currentProducer.close();
    }
    this.currentProducer = null;
  }

  cleanup() {
    this.closeCurrentProducer();
    this.isProducing = false;
    useSoundboardStore.getState().setIsPlaying(false);
    this.audioBufferCache.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch((err) => {
        console.error('[soundboard] Failed to close AudioContext', err);
      });
    }
    this.audioContext = null;
  }
}
