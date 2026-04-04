import { useCallback } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import { getDisplayName } from "@/common/utils/displayName";

export function useResolveUserName(): (userId: number) => string | null {
    const membersByRoomId = useChatV2Store((s) => s.membersByRoomId);

    return useCallback(
        (userId: number): string | null => {
            for (const members of Object.values(membersByRoomId)) {
                const member = members.find((m) => m.userId === userId);
                if (member) {
                    return getDisplayName(
                        { nickname: member.user.nickname, name: member.user.name },
                        `User ${userId}`,
                    );
                }
            }
            return null;
        },
        [membersByRoomId],
    );
}
