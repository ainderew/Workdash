import React, { useEffect, useState } from "react";
import DeskModalShell from "./DeskModalShell";

interface AddMemberModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (userId: number) => void;
}

function AddMemberModal({
    isOpen,
    isSubmitting = false,
    onClose,
    onSubmit,
}: AddMemberModalProps) {
    const [userIdValue, setUserIdValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setUserIdValue("");
        setError(null);
    }, [isOpen]);

    const submit = () => {
        const userId = Number(userIdValue.trim());
        if (!Number.isInteger(userId) || userId <= 0) {
            setError("Enter a valid numeric user ID.");
            return;
        }

        setError(null);
        onSubmit(userId);
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Invite Member"
            subtitle="Add a teammate to this room using their user ID."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="add-room-member-id"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        User ID
                    </label>
                    <input
                        id="add-room-member-id"
                        type="text"
                        inputMode="numeric"
                        value={userIdValue}
                        onChange={(event) => {
                            setUserIdValue(event.target.value.replace(/[^\d]/g, ""));
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        placeholder="e.g. 42"
                        autoFocus
                        className="mt-2 wd-input"
                    />
                </div>

                {error && (
                    <p className="text-xs wd-text-danger">{error}</p>
                )}

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
                        {isSubmitting ? "Inviting..." : "Add Member"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default AddMemberModal;
