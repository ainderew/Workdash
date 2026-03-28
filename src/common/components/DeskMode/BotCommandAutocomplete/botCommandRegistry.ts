/**
 * Registry of all bot commands available for autocomplete.
 *
 * To add a new bot, append a `BotDefinition` to `BOT_REGISTRY`.
 * Each bot declares its own commands — the autocomplete hook
 * flattens and filters them at query time.
 */

export interface BotCommand {
  /** The slash command without the leading "/" (e.g. "play") */
  command: string;
  /** One-line description shown in the flyout */
  description: string;
  /** Optional argument hint shown after the command (e.g. "<url or search>") */
  args?: string;
}

export interface BotDefinition {
  /** Stable identifier — used as React key prefix */
  id: string;
  /** Display name shown in the flyout */
  name: string;
  /**
   * Avatar source. Accepts:
   *  - a static URL or data URI string
   *  - `"lottie:musicbot"` sentinel to use the Lottie-derived snapshot
   */
  avatar: string;
  /** Commands this bot exposes */
  commands: BotCommand[];
}

/** A flattened entry combining bot metadata with a single command */
export interface BotCommandEntry {
  botId: string;
  botName: string;
  botAvatar: string;
  command: string;
  description: string;
  args?: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const MUSIC_BOT_AVATAR_SENTINEL = "lottie:musicbot";

export const BOT_REGISTRY: BotDefinition[] = [
  {
    id: "music-bot",
    name: "Music Bot",
    avatar: MUSIC_BOT_AVATAR_SENTINEL,
    commands: [
      { command: "play", description: "Queue a track from YouTube", args: "<url or search>" },
      { command: "listen", description: "Subscribe to the workspace music session" },
      { command: "unlisten", description: "Unsubscribe from the music session" },
      { command: "queue", description: "Show the current queue" },
      { command: "np", description: "Show the currently playing track" },
      { command: "pause", description: "Pause playback" },
      { command: "resume", description: "Resume playback" },
      { command: "skip", description: "Skip to the next track" },
      { command: "stop", description: "Stop music and end the session" },
      { command: "volume", description: "Set playback volume", args: "<0-100>" },
      { command: "playlists", description: "Open the playlists panel" },
    ],
  },
  {
    id: "fun-bot",
    name: "Fun",
    avatar: "🎲",
    commands: [
      { command: "roll", description: "Roll a random number (0–100)", args: "[max]" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pre-flattened list — rebuilt only when the registry changes (i.e. never at runtime) */
const ALL_ENTRIES: BotCommandEntry[] = BOT_REGISTRY.flatMap((bot) =>
  bot.commands.map((cmd) => ({
    botId: bot.id,
    botName: bot.name,
    botAvatar: bot.avatar,
    command: cmd.command,
    description: cmd.description,
    args: cmd.args,
  })),
);

export function getAllBotCommands(): BotCommandEntry[] {
  return ALL_ENTRIES;
}

export function isMusicBotAvatarSentinel(avatar: string): boolean {
  return avatar === MUSIC_BOT_AVATAR_SENTINEL;
}
