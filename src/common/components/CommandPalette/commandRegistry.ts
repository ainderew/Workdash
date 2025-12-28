import { MessageSquarePlus, ScreenShare } from "lucide-react";
import { Command } from "./types";
import { PollForm } from "./forms/PollForm";
import { ScreenShareService } from "@/communication/screenShare/screenShare";

export const commands: Command[] = [
    {
        id: "create-poll",
        name: "Create Poll",
        description: "Start a team poll with multiple options",
        icon: MessageSquarePlus,
        keywords: ["poll", "vote", "survey", "question", "ask"],
        category: "Communication",
        requiresForm: true,
        formComponent: PollForm,
        handler: ({ setCommandForm }) => {
            setCommandForm("poll");
        },
    },
    {
        id: "share-screen",
        name: "Share Screen",
        description: "Start a screen share session in workdash",
        icon: ScreenShare,
        keywords: ["screenshare", "sharescreen", "screen", "video"],
        category: "Communication",
        requiresForm: false,
        formComponent: undefined,
        handler: () => {
            ScreenShareService.getInstance().startScreenShare();
        },
    },
];

/*
 *
 * Rules
 * If rules changes document here
 *
 * Return all commands if no query
 * Ranked in terms of priority
 * 1. Exact name match
 * 2. Name start with query
 * 3. Name contains query
 * 4. Kyword exact match
 * 5. Keyword contains query
 * 6. Fuzzy character matching (in order)
 * 7. Description contains query
 */
function calculateScore(command: Command, query: string): number {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
        return 0;
    }

    const lowerName = command.name.toLowerCase();
    const lowerDescription = command.description.toLowerCase();

    let score = 0;

    if (lowerName === lowerQuery) {
        score += 100;
    }

    if (lowerName.startsWith(lowerQuery)) {
        score += 50;
    }

    if (lowerName.includes(lowerQuery)) {
        score += 30;
    }

    for (const keyword of command.keywords) {
        if (keyword.toLowerCase() === lowerQuery) {
            score += 40;
            break;
        }
    }

    for (const keyword of command.keywords) {
        if (keyword.toLowerCase().includes(lowerQuery)) {
            score += 20;
            break;
        }
    }

    if (lowerDescription.includes(lowerQuery)) {
        score += 10;
    }

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
