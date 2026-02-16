import React from "react";
import type { ChatV2RoomMember } from "@/communication/chatV2/_types";
import AddMemberModal from "./modals/AddMemberModal";

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
                                <div className="text-xs wd-text-primary truncate">
                                    {member.user.name || `User ${member.userId}`}
                                </div>
                                <div className="text-[10px] wd-text-muted mb-2">
                                    {member.role}
                                </div>
                                <button
                                    type="button"
                                    className="wd-btn-danger"
                                    onClick={() => onRemoveMember(member.userId)}
                                >
                                    Remove
                                </button>
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
