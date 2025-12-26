import { create } from 'zustand';
import { Poll, PollResults } from '@/communication/poll/_types';

interface PollState {
  // State
  polls: Poll[];
  activePollId: string | null;
  userVotes: Map<string, Set<string>>; // pollId -> Set of optionIds

  // Actions
  addPoll: (poll: Poll) => void;
  updatePollResults: (results: PollResults) => void;
  closePoll: (pollId: string) => void;
  recordUserVote: (pollId: string, optionIds: string[]) => void;
  hasUserVoted: (pollId: string) => boolean;
  getPoll: (pollId: string) => Poll | undefined;
  setActivePoll: (pollId: string | null) => void;
  getActivePoll: () => Poll | null;
  clearPolls: () => void;
}

const usePollStore = create<PollState>((set, get) => ({
  // Initial state
  polls: [],
  activePollId: null,
  userVotes: new Map(),

  // Actions
  addPoll: (poll) =>
    set((state) => ({
      polls: [...state.polls, poll],
      activePollId: poll.id, // Automatically show new poll
    })),

  updatePollResults: (results) =>
    set((state) => ({
      polls: state.polls.map((poll) =>
        poll.id === results.pollId
          ? {
              ...poll,
              options: results.options,
              totalVotes: results.totalVotes,
            }
          : poll
      ),
    })),

  closePoll: (pollId) =>
    set((state) => ({
      polls: state.polls.map((poll) =>
        poll.id === pollId ? { ...poll, isActive: false } : poll
      ),
    })),

  recordUserVote: (pollId, optionIds) =>
    set((state) => {
      const newUserVotes = new Map(state.userVotes);
      newUserVotes.set(pollId, new Set(optionIds));
      return { userVotes: newUserVotes };
    }),

  hasUserVoted: (pollId) => {
    const { userVotes } = get();
    return userVotes.has(pollId);
  },

  getPoll: (pollId) => {
    const { polls } = get();
    return polls.find((p) => p.id === pollId);
  },

  setActivePoll: (pollId) => set({ activePollId: pollId }),

  getActivePoll: () => {
    const { polls, activePollId } = get();
    if (!activePollId) return null;
    return polls.find((p) => p.id === activePollId) || null;
  },

  clearPolls: () =>
    set({
      polls: [],
      activePollId: null,
      userVotes: new Map(),
    }),
}));

export default usePollStore;
