import React from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import type { WorkspaceMember } from "@/communication/chatV2/_types";
import MemberPanel from "./MemberPanel";

interface MemberPanelContainerProps {
    memberRoleColors: Map<number, string>;
    wsMembers: WorkspaceMember[];
    workspaceOwnerId: number;
}

function MemberPanelContainer({
    memberRoleColors,
    wsMembers,
    workspaceOwnerId,
}: MemberPanelContainerProps) {
    const currentRoomId = useChatV2Store((s) => s.currentRoomId);
    const membersByRoomId = useChatV2Store((s) => s.membersByRoomId);
    const isManagingMembers = useChatV2Store((s) => s.isManagingMembers);
    const addRoomMember = useChatV2Store((s) => s.addRoomMember);
    const removeRoomMember = useChatV2Store((s) => s.removeRoomMember);

    const roomMembers = currentRoomId
        ? membersByRoomId[currentRoomId] || []
        : [];

    return (
        <MemberPanel
            members={roomMembers}
            memberRoleColors={memberRoleColors}
            isLoading={isManagingMembers}
            workspaceMembers={wsMembers}
            workspaceOwnerId={workspaceOwnerId}
            onAddMember={(userId) => {
                void addRoomMember(userId);
            }}
            onRemoveMember={(userId) => {
                void removeRoomMember(userId);
            }}
        />
    );
}

export { MemberPanelContainer };
