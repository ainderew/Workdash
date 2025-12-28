import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle } from "lucide-react";
import usePollStore from "@/common/store/pollStore";
import { PollService } from "@/communication/poll/poll";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import PollOption from "./PollOption";
import PollResults from "./PollResults";

export default function PollDisplay() {
    const activePoll = usePollStore((state) => state.getActivePoll());
    const setActivePoll = usePollStore((state) => state.setActivePoll);
    const hasUserVoted = usePollStore((state) => state.hasUserVoted);

    const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
    const overlayRef = useRef<HTMLDivElement>(null);

    const backendUserId = window.__BACKEND_USER__?.id;
    const currentUserId = backendUserId
        ? String(backendUserId)
        : MediaTransportService.getInstance().socket.id || "";
    const isCreator = activePoll?.creatorId === currentUserId;
    const userHasVoted = activePoll ? hasUserVoted(activePoll.id) : false;
    const showResults = userHasVoted || !activePoll?.isActive;

    useEffect(() => {
        if (activePoll) {
            console.log("Poll creator check:", {
                pollCreatorId: activePoll.creatorId,
                currentUserId,
                isCreator,
            });
        }
    }, [activePoll, currentUserId, isCreator]);

    useEffect(() => {
        if (!activePoll) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setActivePoll(null);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [activePoll, setActivePoll]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            setActivePoll(null);
        }
    };

    const handleOptionSelect = (optionId: string) => {
        if (showResults) return;

        if (activePoll?.allowMultiple) {
            setSelectedOptionIds((prev) =>
                prev.includes(optionId)
                    ? prev.filter((id) => id !== optionId)
                    : [...prev, optionId],
            );
        } else {
            setSelectedOptionIds([optionId]);
        }
    };

    const handleSubmitVote = () => {
        if (!activePoll || selectedOptionIds.length === 0) return;

        PollService.getInstance().submitVote(activePoll.id, selectedOptionIds);
        setSelectedOptionIds([]);
    };

    const handleClosePoll = () => {
        if (!activePoll) return;
        PollService.getInstance().closePoll(activePoll.id);
    };

    const handleClose = () => {
        setActivePoll(null);
        setSelectedOptionIds([]);
    };

    if (!activePoll) return null;

    const userVotedOptionIds = usePollStore
        .getState()
        .userVotes.get(activePoll.id);
    const userVotedOptionIdsArray = userVotedOptionIds
        ? Array.from(userVotedOptionIds)
        : [];

    const createdAt = new Date(activePoll.createdAt);
    const timeAgo = getTimeAgo(createdAt);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-65 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="poll-title"
        >
            <div className="bg-neutral-900 rounded-lg shadow-2xl border border-neutral-700 w-full max-w-lg">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-neutral-700">
                    <div className="flex-1">
                        <h2
                            id="poll-title"
                            className="text-lg font-semibold text-white mb-1"
                        >
                            {activePoll.question}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>by {activePoll.creatorName}</span>
                            <span>•</span>
                            <span>{timeAgo}</span>
                            {!activePoll.isActive && (
                                <>
                                    <span>•</span>
                                    <span className="text-neutral-500">
                                        Closed
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                        aria-label="Close poll"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Poll Options/Results */}
                <div className="p-6">
                    {showResults ? (
                        <PollResults
                            poll={activePoll}
                            userVotedOptionIds={userVotedOptionIdsArray}
                        />
                    ) : (
                        <div className="space-y-2">
                            {activePoll.options.map((option) => (
                                <PollOption
                                    key={option.id}
                                    option={option}
                                    isSelected={selectedOptionIds.includes(
                                        option.id,
                                    )}
                                    onSelect={() =>
                                        handleOptionSelect(option.id)
                                    }
                                    allowMultiple={activePoll.allowMultiple}
                                    showResults={false}
                                    totalVotes={0}
                                />
                            ))}
                        </div>
                    )}

                    {activePoll.allowMultiple && !showResults && (
                        <p className="mt-3 text-xs text-neutral-500 text-center">
                            You can select multiple options
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-neutral-700">
                    {!showResults && (
                        <button
                            onClick={handleSubmitVote}
                            disabled={selectedOptionIds.length === 0}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Submit Vote
                        </button>
                    )}

                    {isCreator && activePoll.isActive && (
                        <button
                            onClick={handleClosePoll}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                            title="End this poll and show final results to everyone"
                        >
                            End Poll
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
