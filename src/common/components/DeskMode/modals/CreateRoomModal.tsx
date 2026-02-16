import React, { useEffect, useState } from "react";
import DeskModalShell from "./DeskModalShell";

type RoomCategoryOption = {
    id: string | null;
    name: string;
};

interface CreateRoomModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    categoryOptions: RoomCategoryOption[];
    initialCategoryId: string | null;
    onClose: () => void;
    onSubmit: (name: string, categoryId: string | null) => void;
}

const UNCATEGORIZED_KEY = "__workspace_default__";

function CreateRoomModal({
    isOpen,
    isSubmitting = false,
    categoryOptions,
    initialCategoryId,
    onClose,
    onSubmit,
}: CreateRoomModalProps) {
    const [name, setName] = useState("");
    const [categoryKey, setCategoryKey] = useState(UNCATEGORIZED_KEY);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setError(null);
        setCategoryKey(initialCategoryId ?? UNCATEGORIZED_KEY);
    }, [initialCategoryId, isOpen]);

    const submit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Channel name is required.");
            return;
        }

        setError(null);
        onSubmit(
            trimmedName,
            categoryKey === UNCATEGORIZED_KEY ? null : categoryKey,
        );
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Create Channel"
            subtitle="Text channels are where your team collaborates."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="create-room-name"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Channel Name
                    </label>
                    <input
                        id="create-room-name"
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
                        placeholder="e.g. design-updates"
                        autoFocus
                        className="mt-2 wd-input"
                    />
                </div>

                <div>
                    <label
                        htmlFor="create-room-category"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Category
                    </label>
                    <select
                        id="create-room-category"
                        value={categoryKey}
                        onChange={(event) => setCategoryKey(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border wd-border-subtle wd-bg-app px-3 text-sm wd-text-primary outline-none transition-colors focus:border-[var(--wd-accent)]"
                    >
                        {categoryOptions.map((category) => (
                            <option
                                key={category.id ?? UNCATEGORIZED_KEY}
                                value={category.id ?? UNCATEGORIZED_KEY}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>
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
                        {isSubmitting ? "Creating..." : "Create Channel"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default CreateRoomModal;
