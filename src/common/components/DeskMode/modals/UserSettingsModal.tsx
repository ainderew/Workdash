import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Settings, X } from "lucide-react";
import useUserStore from "@/common/store/useStore";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";
import { getDisplayNameFromParts } from "@/common/utils/displayName";

const MAX_NAME_LENGTH = 20;
const MAX_NICKNAME_LENGTH = 20;

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const { data: session } = useSession();
    const user = useUserStore((state) => state.user);
    const updateUser = useUserStore((state) => state.updateUser);
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const resolvedName =
            user.name?.trim() ||
            session?.backendUser?.name?.trim() ||
            session?.user?.name?.trim() ||
            "";
        const resolvedNickname =
            user.nickname?.trim() ||
            session?.backendUser?.nickname?.trim() ||
            "";

        setName(resolvedName);
        setNickname(resolvedNickname);
        setError(null);
    }, [isOpen, session?.backendUser?.name, session?.backendUser?.nickname, session?.user?.name, user.name, user.nickname]);

    const previewName = useMemo(
        () => getDisplayNameFromParts(nickname, name, "You"),
        [name, nickname],
    );

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();

        const normalizedName = name.trim();
        const normalizedNickname = nickname.trim();

        if (!normalizedName) {
            setError("Full name cannot be empty.");
            return;
        }

        if (normalizedName.length > MAX_NAME_LENGTH) {
            setError(`Full name must be ${MAX_NAME_LENGTH} characters or fewer.`);
            return;
        }

        if (normalizedNickname.length > MAX_NICKNAME_LENGTH) {
            setError(
                `Nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer.`,
            );
            return;
        }

        if (!session?.backendJwt) {
            setError("You must be logged in to update your settings.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: normalizedName,
                    nickname: normalizedNickname.length > 0
                        ? normalizedNickname
                        : null,
                }),
            });

            const responseBody = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    responseBody?.error || `Server error: ${response.status}`,
                );
            }

            const updatedUser = responseBody?.user ?? responseBody;
            const updatedName =
                typeof updatedUser?.name === "string"
                    ? updatedUser.name.trim()
                    : normalizedName;
            const updatedNickname =
                typeof updatedUser?.nickname === "string"
                    ? updatedUser.nickname.trim()
                    : updatedUser?.nickname === null
                      ? null
                      : normalizedNickname.length > 0
                        ? normalizedNickname
                        : null;

            updateUser({
                name: updatedName,
                nickname: updatedNickname,
            });

            if (window.__BACKEND_USER__) {
                window.__BACKEND_USER__ = {
                    ...window.__BACKEND_USER__,
                    name: updatedName,
                    nickname: updatedNickname,
                };
            }

            const effectiveDisplayName = getDisplayNameFromParts(
                updatedNickname,
                updatedName,
                updatedName,
            );

            CharacterEventBus.emitNameUpdate(effectiveDisplayName);

            const multiplayer = window.__MULTIPLAYER__;
            if (multiplayer && typeof multiplayer.emitNameUpdate === "function") {
                multiplayer.emitNameUpdate(updatedName, updatedNickname);
            }

            onClose();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to update user settings",
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
                <div className="relative h-24 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
                    <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                        <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
                                <Settings size={15} className="wd-text-secondary" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold wd-text-primary">
                                    User Settings
                                </p>
                                <p className="text-xs wd-text-muted">
                                    Update your full name and nickname
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close settings modal"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4 p-4">
                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Profile Preview
                        </p>
                        <p className="mt-1 text-lg font-semibold wd-text-primary truncate">
                            {previewName}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={MAX_NAME_LENGTH}
                            placeholder="Enter your full name"
                            className="mt-1 h-10 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
                            Nickname (Optional)
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(event) => setNickname(event.target.value)}
                            maxLength={MAX_NICKNAME_LENGTH}
                            placeholder="Shown instead of full name"
                            className="mt-1 h-10 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                    </div>

                    {error && (
                        <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-sm wd-text-danger">
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="h-9 rounded-md border wd-border-subtle px-3 text-sm wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-sm font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UserSettingsModal;

