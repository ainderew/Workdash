export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  createdAt: Date;
  expiresAt?: Date;
  allowMultiple: boolean;
  isActive: boolean;
  totalVotes: number;
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
