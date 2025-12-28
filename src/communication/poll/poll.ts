import useUserStore from '@/common/store/useStore';
import usePollStore from '@/common/store/pollStore';
import { MediaTransportService } from '../mediaTransportService/mediaTransportServive';
import { PollEvents } from './_enums';
import type { Poll, BackendPollData, CreatePollData, PollVote, PollResults } from './_types';

export class PollService {
  public static instance: PollService;
  private sfuService: MediaTransportService;

  constructor() {
    this.sfuService = MediaTransportService.getInstance();
  }

  public static getInstance(): PollService {
    if (!PollService.instance) {
      PollService.instance = new PollService();
    }
    return PollService.instance;
  }

  /**
   * Create a new poll and broadcast to all users
   */
  createPoll(data: CreatePollData): void {
    // Use backend user ID for reliable creator identification
    const backendUserId = window.__BACKEND_USER__?.id;
    const userId = backendUserId ? String(backendUserId) : this.sfuService.socket.id || '';
    const userName = useUserStore.getState().user.name;

    const pollData = {
      ...data,
      creatorId: userId,
      creatorName: userName,
    };

    console.log('Creating poll with creatorId:', userId);
    this.sfuService.socket.emit(PollEvents.CREATE_POLL, pollData);
  }

  /**
   * Submit a vote for a poll
   */
  submitVote(pollId: string, optionIds: string[]): void {
    const userId = this.sfuService.socket.id || '';

    const voteData: Partial<PollVote> = {
      pollId,
      userId,
      optionIds,
      timestamp: new Date(),
    };

    // Record vote locally (optimistic update)
    usePollStore.getState().recordUserVote(pollId, optionIds);

    // Send to server
    this.sfuService.socket.emit(PollEvents.SUBMIT_VOTE, voteData);
  }

  /**
   * Close a poll (creator only)
   */
  closePoll(pollId: string): void {
    const backendUserId = window.__BACKEND_USER__?.id;
    const userId = backendUserId ? String(backendUserId) : this.sfuService.socket.id || '';

    this.sfuService.socket.emit(PollEvents.CLOSE_POLL, {
      pollId,
      userId // Send userId so backend can verify creator
    });
  }

  /**
   * Transform backend poll data to match frontend Poll type
   */
  private transformPollData(pollData: BackendPollData): Poll {
    return {
      ...pollData,
      createdAt: new Date(pollData.createdAt),
      allowMultiple: pollData.allowMultiple ?? false,
      totalVotes: pollData.totalVotes ?? pollData.voters?.length ?? 0,
      expiresAt: pollData.expiresAt ? new Date(pollData.expiresAt) : undefined,
    };
  }

  /**
   * Setup listeners for poll-related socket events
   */
  setupPollListeners(): void {
    // Listen for new polls
    this.sfuService.socket.on(PollEvents.NEW_POLL, (pollData: BackendPollData) => {
      console.log('📊 New poll received:', pollData);
      const poll = this.transformPollData(pollData);
      usePollStore.getState().addPoll(poll);
    });

    // Listen for poll result updates
    this.sfuService.socket.on(
      PollEvents.POLL_UPDATED,
      (results: PollResults) => {
        console.log('📊 Poll results updated:', results);
        usePollStore.getState().updatePollResults(results);
      }
    );

    // Listen for poll closure
    this.sfuService.socket.on(
      PollEvents.POLL_CLOSED,
      ({ pollId }: { pollId: string }) => {
        console.log('📊 Poll closed:', pollId);
        usePollStore.getState().closePoll(pollId);
      }
    );
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    this.sfuService.socket.off(PollEvents.NEW_POLL);
    this.sfuService.socket.off(PollEvents.POLL_UPDATED);
    this.sfuService.socket.off(PollEvents.POLL_CLOSED);
  }
}
