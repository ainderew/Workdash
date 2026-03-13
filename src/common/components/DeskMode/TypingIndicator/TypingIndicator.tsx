import React, { useMemo } from "react";
import { useTypingUsers, type TypingDisplayUser } from "./useTypingUsers";
import TypingAvatarStack from "./TypingAvatarStack";

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 ml-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--wd-text-muted)] animate-bounce [animation-duration:0.8s]" />
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--wd-text-muted)] animate-bounce [animation-delay:0.15s] [animation-duration:0.8s]" />
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--wd-text-muted)] animate-bounce [animation-delay:0.3s] [animation-duration:0.8s]" />
        </span>
    );
}

function TypingLabel({ users }: { users: TypingDisplayUser[] }) {
    if (users.length === 1) {
        return (
            <span>
                <strong className="font-semibold wd-text-secondary">
                    {users[0].displayName}
                </strong>{" "}
                is typing
            </span>
        );
    }
    if (users.length === 2) {
        return (
            <span>
                <strong className="font-semibold wd-text-secondary">
                    {users[0].displayName}
                </strong>{" "}
                and{" "}
                <strong className="font-semibold wd-text-secondary">
                    {users[1].displayName}
                </strong>{" "}
                are typing
            </span>
        );
    }
    if (users.length === 3) {
        return (
            <span>
                <strong className="font-semibold wd-text-secondary">
                    {users[0].displayName}
                </strong>
                ,{" "}
                <strong className="font-semibold wd-text-secondary">
                    {users[1].displayName}
                </strong>
                , and{" "}
                <strong className="font-semibold wd-text-secondary">
                    {users[2].displayName}
                </strong>{" "}
                are typing
            </span>
        );
    }
    return <span>Several people are typing</span>;
}

interface TypingIndicatorProps {
    roomId: string | null;
}

export default function TypingIndicator({ roomId }: TypingIndicatorProps) {
    const users = useTypingUsers(roomId);
    const isActive = users.length > 0;

    const ariaLabel = useMemo(() => {
        if (!isActive) return undefined;
        if (users.length === 1) return `${users[0].displayName} is typing`;
        if (users.length === 2)
            return `${users[0].displayName} and ${users[1].displayName} are typing`;
        if (users.length === 3)
            return `${users[0].displayName}, ${users[1].displayName}, and ${users[2].displayName} are typing`;
        return "Several people are typing";
    }, [users, isActive]);

    return (
        <div className="relative">
            {isActive && (
                <div
                    className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-1 text-xs wd-text-muted wd-bg-panel-2"
                    role="status"
                    aria-live="polite"
                    aria-label={ariaLabel}
                >
                    <TypingAvatarStack users={users} />
                    <span className="flex items-center leading-none">
                        <TypingLabel users={users} />
                        <TypingDots />
                    </span>
                </div>
            )}
        </div>
    );
}
