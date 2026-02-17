import React, { useEffect, useState } from "react";
import DeskModalShell from "./DeskModalShell";

interface RenameRoomModalProps {
    isOpen: boolean;
    roomName: string;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

function RenameRoomModal({
    isOpen,
    roomName,
    isSubmitting = false,
    onClose,
    onSubmit,
}: RenameRoomModalProps) {
    const [name, setName] = useState(roomName);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName(roomName);
        setError(null);
    }, [isOpen, roomName]);

    const submit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Channel name is required.");
            return;
        }

        if (trimmedName === roomName.trim()) {
            onClose();
            return;
        }

        setError(null);
        onSubmit(trimmedName);
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Rename Channel"
            subtitle="Update this channel name for everyone in the server."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="rename-room-name"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Channel Name
                    </label>
                    <input
                        id="rename-room-name"
                        type="text"
                        value={name}
                        maxLength={64}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        autoFocus
                        className="mt-2 wd-input"
                    />
                </div>

                {error && <p className="text-xs wd-text-danger">{error}</p>}

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
                        onClick={submit}
                        disabled={isSubmitting}
                        className="wd-btn-primary"
                    >
                        {isSubmitting ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default RenameRoomModal;
