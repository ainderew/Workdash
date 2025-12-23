import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/common/store/useStore";
import { CONFIG } from "@/common/utils/config";
import { X, Loader2 } from "lucide-react";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";

interface EditNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
}

export function EditNameModal({
    isOpen,
    onClose,
    currentName,
}: EditNameModalProps) {
    const { data: session } = useSession();

    // Use the specific update action from your store
    const updateUser = useUserStore((state) => state.updateUser);

    const [name, setName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            setError(null);
        }
    }, [isOpen, currentName]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Name cannot be empty");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const token = session?.backendJwt;

            if (!token) {
                throw new Error("You must be logged in to update your name.");
            }

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/user/update-name`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name: name.trim() }),
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || `Server error: ${response.status}`,
                );
            }

            // 1. Get the updated user object from the backend
            const updatedUserFromBackend = await response.json();

            // 2. Update ONLY the name in your global store.
            // We explicitly pick 'name' to ensure we don't overwrite client-side
            // fields (like producerIds) with backend data that might be missing them.
            updateUser({ name: updatedUserFromBackend.name });
            CharacterEventBus.emitNameUpdate(name.trim());
            onClose();
        } catch (err) {
            console.error("Failed to update name:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred",
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">
                        Edit Name
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={20}
                                className="w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-neutral-600"
                                placeholder="Enter your name..."
                                autoFocus
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name.trim()}
                                className="flex-1 px-4 py-2 text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
