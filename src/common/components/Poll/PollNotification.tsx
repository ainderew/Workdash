import React from "react";
import { useEffect, useRef } from "react";
import { MessageSquarePlus, CheckCircle2 } from "lucide-react";
import usePollStore from "@/common/store/pollStore";
import type { Poll } from "./types";

interface PollNotificationItemProps {
    poll: Poll;
    hasVoted: boolean;
    onClick: () => void;
}

function PollNotificationItem({
    poll,
    hasVoted,
    onClick,
}: PollNotificationItemProps) {
    if (hasVoted) {
        // Mini compact version for voted polls
        return (
            <div
                onClick={onClick}
                className="bg-neutral-900/90 border border-neutral-700/50 rounded-lg shadow-lg p-2.5 cursor-pointer hover:bg-neutral-800 hover:border-neutral-600 transition-all group"
                role="button"
                aria-label="View poll results"
            >
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-300 truncate">
                            {poll.question}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                            Voted · {poll.totalVotes}{" "}
                            {poll.totalVotes === 1 ? "vote" : "votes"}
                        </p>
                    </div>
                    <div className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                    </div>
                </div>
            </div>
        );
    }

    // Full version for unvoted polls
    return (
        <button
            onClick={onClick}
            className="bg-neutral-800 flex flex-1 min-w-68 border border-neutral-700 rounded-lg shadow-2xl p-4 cursor-pointer hover:bg-neutral-900 transition-colors animate-in slide-in-from-right duration-300"
            role="alert"
        >
            <div className="flex items-start gap-3 flex-1 cursor-pointer">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <MessageSquarePlus className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col items-start">
                    <p className="text-xs font-semibold text-white mb-1">
                        Active Poll
                    </p>
                    <p className="text-xs text-neutral-300 mb-1">
                        From {poll.creatorName}
                    </p>
                    <p className="text-xs text-neutral-400 truncate line-clamp-2">
                        {poll.question}
                    </p>
                    <div className="flex w-full items-center justify-between mt-2">
                        <p className="text-xs text-cyan-400 font-medium">
                            Click to vote
                        </p>
                        <p className="text-xs text-neutral-500">
                            {poll.totalVotes}{" "}
                            {poll.totalVotes === 1 ? "vote" : "votes"}
                        </p>
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function PollNotification() {
    const polls = usePollStore((state) => state.polls);
    const hasUserVoted = usePollStore((state) => state.hasUserVoted);
    const setActivePoll = usePollStore((state) => state.setActivePoll);
    const previousPollCountRef = useRef(polls.length); // Initialize with current count
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioEnabledRef = useRef(false);
    const isInitialMountRef = useRef(true);

    const activePolls = polls.filter((poll) => poll.isActive);
    const unvotedPolls = activePolls.filter((poll) => !hasUserVoted(poll.id));
    const votedPolls = activePolls.filter((poll) => hasUserVoted(poll.id));

    useEffect(() => {
        audioRef.current = new Audio("/assets/notification.mp3");
        audioRef.current.volume = 0.5;
        audioRef.current.preload = "auto";

        const enableAudio = () => {
            if (!audioEnabledRef.current && audioRef.current) {
                // Play and immediately pause to unlock audio
                audioRef.current
                    .play()
                    .then(() => {
                        audioRef.current?.pause();
                        audioRef.current!.currentTime = 0;
                        audioEnabledRef.current = true;
                        console.log("🔊 Audio enabled for notifications");
                    })
                    .catch(() => {});
            }
        };

        window.addEventListener("click", enableAudio, { once: true });
        window.addEventListener("keydown", enableAudio, { once: true });

        return () => {
            window.removeEventListener("click", enableAudio);
            window.removeEventListener("keydown", enableAudio);
        };
    }, []);

    useEffect(() => {
        const currentPollCount = polls.length;

        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            previousPollCountRef.current = currentPollCount;
            return;
        }

        if (currentPollCount > previousPollCountRef.current) {
            console.log("🔔 New poll detected! Playing notification sound...");

            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current
                    .play()
                    .then(() => {
                        console.log("✅ Notification sound played");
                    })
                    .catch((error) => {
                        console.warn("⚠️ Could not play sound:", error.message);
                        if (!audioEnabledRef.current) {
                            console.log(
                                "💡 Click anywhere on the page to enable notification sounds",
                            );
                        }
                    });
            }
        }

        previousPollCountRef.current = currentPollCount;
    }, [polls.length]);

    if (activePolls.length === 0) return null;

    const handlePollClick = (pollId: string) => {
        setActivePoll(pollId);
    };

    return (
        <div className="fixed top-4 right-4 z-55 space-y-2 max-w-sm">
            {unvotedPolls.map((poll) => (
                <PollNotificationItem
                    key={poll.id}
                    poll={poll}
                    hasVoted={false}
                    onClick={() => handlePollClick(poll.id)}
                />
            ))}

            {votedPolls.map((poll) => (
                <PollNotificationItem
                    key={poll.id}
                    poll={poll}
                    hasVoted={true}
                    onClick={() => handlePollClick(poll.id)}
                />
            ))}
        </div>
    );
}
