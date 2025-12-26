import { MessageSquarePlus } from 'lucide-react';
import { Command } from './types';
import { PollForm } from './forms/PollForm';

export const commands: Command[] = [
  {
    id: 'create-poll',
    name: 'Create Poll',
    description: 'Start a team poll with multiple options',
    icon: MessageSquarePlus,
    keywords: ['poll', 'vote', 'survey', 'question', 'ask'],
    category: 'Communication',
    requiresForm: true,
    formComponent: PollForm,
    handler: ({ setCommandForm }) => {
      setCommandForm('poll');
    },
  },
];

/**
 * Calculate fuzzy match score for a command against a query
 * Higher score = better match
 */
function calculateScore(command: Command, query: string): number {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return 1; // Return all commands if no query
  }

  const lowerName = command.name.toLowerCase();
  const lowerDescription = command.description.toLowerCase();

  let score = 0;

  // Exact name match (highest priority)
  if (lowerName === lowerQuery) {
    score += 100;
  }

  // Name starts with query
  if (lowerName.startsWith(lowerQuery)) {
    score += 50;
  }

  // Name contains query
  if (lowerName.includes(lowerQuery)) {
    score += 30;
  }

  // Keyword exact match
  for (const keyword of command.keywords) {
    if (keyword.toLowerCase() === lowerQuery) {
      score += 40;
      break;
    }
  }

  // Keyword contains query
  for (const keyword of command.keywords) {
    if (keyword.toLowerCase().includes(lowerQuery)) {
      score += 20;
      break;
    }
  }

  // Description contains query
  if (lowerDescription.includes(lowerQuery)) {
    score += 10;
  }

  // Fuzzy character matching (all characters present in order)
  let queryIndex = 0;
  for (const char of lowerName) {
    if (char === lowerQuery[queryIndex]) {
      queryIndex++;
      if (queryIndex === lowerQuery.length) {
        score += 15;
        break;
      }
    }
  }

  return score;
}

/**
 * Search and filter commands based on query
 * Returns commands sorted by relevance score
 */
export function searchCommands(query: string): Command[] {
  return commands
    .map((cmd) => ({ command: cmd, score: calculateScore(cmd, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ command }) => command);
}
