export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string; // Backend user ID (from window.__BACKEND_USER__.id)
  creatorName: string;
  createdAt: Date;
  expiresAt?: Date;
  allowMultiple: boolean;
  isActive: boolean;
  totalVotes: number;
}

/**
 * Raw poll data from backend (before transformation)
 * Fields may be missing or have different types than Poll interface
 */
export interface BackendPollData {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  createdAt: string; // ISO string, not Date object
  expiresAt?: string; // ISO string, not Date object
  allowMultiple?: boolean; // May be missing
  isActive: boolean;
  totalVotes?: number; // May be missing
  voters?: string[]; // Alternative to totalVotes
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollVote {
  pollId: string;
  userId: string;
  optionIds: string[];
  timestamp: Date;
}

export interface PollResults {
  pollId: string;
  options: PollOption[];
  totalVotes: number;
  voters: string[]; // userIds who have voted
}

export interface CreatePollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  durationMinutes?: number;
}
