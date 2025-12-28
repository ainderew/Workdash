import React from "react";
import type { Poll } from "./types";
import PollOption from "./PollOption";

interface PollResultsProps {
    poll: Poll;
    userVotedOptionIds: string[];
}

export default function PollResults({
    poll,
    userVotedOptionIds,
}: PollResultsProps) {
    return (
        <div className="space-y-2">
            {poll.options.map((option) => (
                <PollOption
                    key={option.id}
                    option={option}
                    isSelected={userVotedOptionIds.includes(option.id)}
                    onSelect={() => {}}
                    allowMultiple={poll.allowMultiple}
                    showResults={true}
                    totalVotes={poll.totalVotes}
                />
            ))}

            <div className="pt-2 text-center text-sm text-neutral-400">
                {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}{" "}
                total
            </div>
        </div>
    );
}
