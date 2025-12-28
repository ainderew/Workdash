import React from "react";
import { Check } from "lucide-react";
import type { PollOption as PollOptionType } from "./types";

interface PollOptionProps {
    option: PollOptionType;
    isSelected: boolean;
    onSelect: () => void;
    allowMultiple: boolean;
    showResults: boolean;
    totalVotes: number;
}

export default function PollOption({
    option,
    isSelected,
    onSelect,
    allowMultiple,
    showResults,
    totalVotes,
}: PollOptionProps) {
    const percentage =
        totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

    return (
        <button
            onClick={onSelect}
            disabled={showResults}
            className={`
        w-full p-3 rounded-lg border transition-all text-left
        ${
            showResults
                ? "cursor-default bg-neutral-800"
                : "cursor-pointer hover:bg-neutral-800"
        }
        ${
            isSelected
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-neutral-700 bg-neutral-900"
        }
      `}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    {!showResults && (
                        <div
                            className={`
                flex items-center justify-center w-5 h-5 rounded border transition-colors
                ${
                    isSelected
                        ? "border-cyan-500 bg-cyan-500"
                        : "border-neutral-600"
                }
                ${allowMultiple ? "rounded" : "rounded-full"}
              `}
                        >
                            {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                            )}
                        </div>
                    )}
                    <span className="text-sm font-medium text-white flex-1">
                        {option.text}
                    </span>
                </div>

                {showResults && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-400">
                            {option.votes}{" "}
                            {option.votes === 1 ? "vote" : "votes"}
                        </span>
                        <span className="text-sm font-semibold text-cyan-400 w-12 text-right">
                            {percentage}%
                        </span>
                    </div>
                )}
            </div>

            {showResults && (
                <div className="mt-2 h-2 bg-neutral-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ${
                            isSelected ? "opacity-100" : "opacity-70"
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </button>
    );
}
