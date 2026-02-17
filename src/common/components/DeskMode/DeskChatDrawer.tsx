import React from "react";
import SidebarMenu from "@/common/components/SidebarMenu/SidebarMenu";
import CompactChatShell from "./CompactChatShell";

interface DeskChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

function DeskChatDrawer({
    isOpen,
    onClose,
}: DeskChatDrawerProps) {
    return (
        <SidebarMenu isOpen={isOpen} variant="desk-chat">
            <CompactChatShell onClose={onClose} />
        </SidebarMenu>
    );
}

export default DeskChatDrawer;
