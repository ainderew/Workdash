import { useMemo } from "react";
import {
  getAllBotCommands,
  type BotCommandEntry,
} from "./botCommandRegistry";

const MAX_RESULTS = 10;

/**
 * Filters the bot command registry by a slash-command query.
 *
 * @param query - The text after "/" (e.g. "pl" from "/pl").
 *                Empty string returns all commands (browse mode).
 * @returns Matching entries sorted by relevance (prefix match first, then substring).
 */
export function useBotCommandSearch(query: string): BotCommandEntry[] {
  return useMemo(() => {
    const all = getAllBotCommands();
    if (!query) return all.slice(0, MAX_RESULTS);

    const lower = query.toLowerCase();

    const prefixMatches: BotCommandEntry[] = [];
    const substringMatches: BotCommandEntry[] = [];

    for (const entry of all) {
      if (entry.command.startsWith(lower)) {
        prefixMatches.push(entry);
      } else if (entry.command.includes(lower)) {
        substringMatches.push(entry);
      }
    }

    return [...prefixMatches, ...substringMatches].slice(0, MAX_RESULTS);
  }, [query]);
}
