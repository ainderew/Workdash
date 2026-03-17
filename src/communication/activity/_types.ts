export type ActivityType = "listening" | "watching" | "playing" | "custom";

export type ListeningActivity = {
  type: "listening";
  title: string;
  startedAt: number;
};

export type WatchingActivity = {
  type: "watching";
  title: string;
  startedAt: number;
};

export type PlayingActivity = {
  type: "playing";
  title: string;
  startedAt: number;
};

export type CustomActivity = {
  type: "custom";
  text: string;
  emoji: string;
  startedAt: number;
};

export type UserActivity =
  | ListeningActivity
  | WatchingActivity
  | PlayingActivity
  | CustomActivity;
