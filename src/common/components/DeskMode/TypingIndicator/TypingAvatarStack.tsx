import React from "react";
import Image from "next/image";
import type { TypingDisplayUser } from "./useTypingUsers";

interface TypingAvatarStackProps {
    users: TypingDisplayUser[];
}

export default function TypingAvatarStack({ users }: TypingAvatarStackProps) {
    const visible = users.slice(0, 3);
    if (visible.length === 0) return null;

    return (
        <div className="flex items-center shrink-0">
            {visible.map((user, i) => (
                <div
                    key={user.userId}
                    className={`relative w-5 h-5 rounded-full border border-[var(--wd-surface-panel-2)] overflow-hidden ${i > 0 ? "-ml-2" : ""}`}
                >
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.displayName}
                            width={20}
                            height={20}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center wd-bg-elevated wd-text-muted text-[8px] font-bold uppercase">
                            {user.displayName.charAt(0)}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
