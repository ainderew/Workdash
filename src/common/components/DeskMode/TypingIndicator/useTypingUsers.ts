import { useEffect, useMemo } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import useUserStore from "@/common/store/useStore";

export type TypingDisplayUser = {
    userId: number;
    displayName: string;
    avatarUrl: string | null;
};

export function useTypingUsers(roomId: string | null): TypingDisplayUser[] {
    const typingEntries = useChatV2Store(
        (s) => (roomId ? s.typingUsersByRoomId[roomId] : undefined),
    );
    const members = useChatV2Store(
        (s) => (roomId ? s.membersByRoomId[roomId] : undefined),
    );
    const localUserId = useUserStore((s) => s.backendUser?.id);
    const clearTypingUser = useChatV2Store((s) => s.clearTypingUser);

    // Prune expired entries every second (safety net for missed stop events)
    useEffect(() => {
        if (!roomId) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const current =
                useChatV2Store.getState().typingUsersByRoomId[roomId];
            if (!current) return;
            for (const entry of current) {
                if (entry.expiresAt < now) {
                    clearTypingUser(roomId, entry.userId);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [roomId, clearTypingUser]);

    return useMemo(() => {
        if (!typingEntries) return [];
        const now = Date.now();
        return typingEntries
            .filter((t) => t.userId !== localUserId && t.expiresAt > now)
            .map((t) => {
                const member = members?.find((m) => m.userId === t.userId);
                return {
                    userId: t.userId,
                    displayName: t.displayName,
                    avatarUrl: member?.user?.image ?? null,
                };
            });
    }, [typingEntries, members, localUserId]);
}
