import React from "react";
import ChannelHashIcon from "../ChannelHashIcon";
import DeskModalShell from "./DeskModalShell";

interface DeleteRoomModalProps {
    isOpen: boolean;
    roomName: string;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function DeleteRoomModal({
    isOpen,
    roomName,
    isSubmitting = false,
    onClose,
    onConfirm,
}: DeleteRoomModalProps) {
    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Channel"
            subtitle="This channel will be removed from the sidebar."
        >
            <div className="space-y-4">
                <p className="text-sm wd-text-secondary">
                    Delete <span className="font-semibold wd-text-primary inline-flex items-center gap-0.5"><ChannelHashIcon size={14} className="inline-block align-text-bottom opacity-60" />{roomName}</span>?
                    Existing history will stay in storage, but the channel is archived and no
                    longer shown in Desk mode.
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="wd-btn-ghost"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--wd-danger)] px-4 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Deleting..." : "Delete Channel"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default DeleteRoomModal;
