import React from "react";
import type { ChatV2RoomMember } from "@/communication/chatV2/_types";
import AddMemberModal from "./modals/AddMemberModal";
import { getDisplayName } from "@/common/utils/displayName";
import { UserRoundX } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MemberPanelProps {
    members: ChatV2RoomMember[];
    isLoading: boolean;
    onAddMember: (userId: number) => void;
    onRemoveMember: (userId: number) => void;
}

function MemberPanel({
    members,
    isLoading,
    onAddMember,
    onRemoveMember,
}: MemberPanelProps) {
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = React.useState(false);

    return (
        <>
            <aside className="w-56 wd-bg-panel border-l wd-border-subtle p-4 hidden xl:block">
                <div className="flex items-center justify-between mb-3 gap-2">
                    <h3 className="text-xs uppercase tracking-wider wd-text-muted">
                        Members
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsAddMemberModalOpen(true)}
                        disabled={isLoading}
                        className="text-[10px] px-2 py-1 rounded wd-bg-accent-soft wd-text-accent hover:bg-[var(--wd-accent)]/25 disabled:opacity-50"
                    >
                        + Add
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-xs wd-text-muted">Loading members...</div>
                ) : members.length === 0 ? (
                    <div className="text-xs wd-text-muted">No active members.</div>
                ) : (
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div
                                key={`${member.roomId}-${member.userId}`}
                                className="rounded-md wd-bg-elevated px-2 py-2 border wd-border-subtle"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-xs wd-text-primary truncate">
                                            {getDisplayName(
                                                member.user,
                                                `User ${member.userId}`,
                                            )}
                                        </div>
                                        <div className="text-[10px] wd-text-muted">
                                            {member.role}
                                        </div>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Remove member"
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-800/70 bg-red-950/40 text-red-300 transition-colors hover:bg-red-900/55"
                                                onClick={() => onRemoveMember(member.userId)}
                                            >
                                                <UserRoundX size={14} />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <span>Remove member</span>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </aside>

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                isSubmitting={isLoading}
                onClose={() => setIsAddMemberModalOpen(false)}
                onSubmit={(userId) => {
                    onAddMember(userId);
                    setIsAddMemberModalOpen(false);
                }}
            />
        </>
    );
}

export default MemberPanel;
