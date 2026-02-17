import React, { useEffect, useState } from "react";
import DeskModalShell from "./DeskModalShell";

interface RenameCategoryModalProps {
    isOpen: boolean;
    categoryName: string;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

function RenameCategoryModal({
    isOpen,
    categoryName,
    isSubmitting = false,
    onClose,
    onSubmit,
}: RenameCategoryModalProps) {
    const [name, setName] = useState(categoryName);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName(categoryName);
        setError(null);
    }, [isOpen, categoryName]);

    const submit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Category name is required.");
            return;
        }

        if (trimmedName === categoryName.trim()) {
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
            title="Rename Category"
            subtitle="Update this category label for all channels inside it."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="rename-category-name"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Category Name
                    </label>
                    <input
                        id="rename-category-name"
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

export default RenameCategoryModal;
