import React, { useEffect, useState } from "react";
import DeskModalShell from "./DeskModalShell";

interface CreateCategoryModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

function CreateCategoryModal({
    isOpen,
    isSubmitting = false,
    onClose,
    onSubmit,
}: CreateCategoryModalProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setError(null);
    }, [isOpen]);

    const submit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Category name is required.");
            return;
        }

        setError(null);
        onSubmit(trimmedName);
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Create Category"
            subtitle="Organize channels with collapsible sections."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="create-category-name"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Category Name
                    </label>
                    <input
                        id="create-category-name"
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
                        placeholder="e.g. Team Chat"
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
                        {isSubmitting ? "Creating..." : "Create Category"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default CreateCategoryModal;
