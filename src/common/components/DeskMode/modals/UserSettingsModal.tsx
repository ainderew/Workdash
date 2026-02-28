import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, ImagePlus, Loader2, Settings, Trash2, X } from "lucide-react";
import useUserStore from "@/common/store/useStore";
import { CharacterEventBus } from "@/game/character/CharacterEventBus";
import { getDisplayNameFromParts } from "@/common/utils/displayName";
import { THEME_OPTIONS } from "@/common/theme/themeRegistry";
import { ThemeId } from "@/common/theme/_types";
import useThemeStore from "@/common/store/themeStore";
import { CONFIG } from "@/common/utils/config";

const MAX_NAME_LENGTH = 20;
const MAX_NICKNAME_LENGTH = 20;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const { data: session } = useSession();
    const user = useUserStore((state) => state.user);
    const updateUser = useUserStore((state) => state.updateUser);
    const theme = useThemeStore((state) => state.theme);
    const setThemeLocal = useThemeStore((state) => state.setThemeLocal);
    const persistTheme = useThemeStore((state) => state.persistTheme);
    const isThemeSyncing = useThemeStore((state) => state.isSyncing);
    const themeSyncError = useThemeStore((state) => state.lastSyncError);
    const clearThemeSyncError = useThemeStore((state) => state.clearSyncError);
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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
        setAvatarFile(null);
        setAvatarPreview(null);
        clearThemeSyncError();
    }, [clearThemeSyncError, isOpen, session?.backendUser?.name, session?.backendUser?.nickname, session?.user?.name, user.name, user.nickname]);

    useEffect(() => {
        return () => {
            if (avatarPreview && avatarPreview.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const handleAvatarFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            const file = event.target.files?.[0];
            if (!file) return;

            if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
                setError("Invalid file type. Allowed: PNG, JPEG, WebP, GIF");
                return;
            }

            if (file.size > MAX_AVATAR_SIZE) {
                setError("File size exceeds 5MB limit");
                return;
            }

            if (avatarPreview && avatarPreview.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreview);
            }

            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        },
        [avatarPreview],
    );

    const handleDeleteAvatar = async () => {
        const jwt = window.__BACKEND_JWT__;
        if (!jwt) {
            setError("Not authenticated");
            return;
        }

        setIsDeletingAvatar(true);
        setError(null);

        try {
            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/users/me/avatar`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${jwt}` },
                },
            );

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(
                    body?.error || `Delete failed: ${response.status}`,
                );
            }

            updateUser({ image: undefined });
            if (window.__BACKEND_USER__) {
                window.__BACKEND_USER__ = {
                    ...window.__BACKEND_USER__,
                    image: undefined,
                };
            }
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Failed to remove avatar",
            );
        } finally {
            setIsDeletingAvatar(false);
        }
    };

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
            if (avatarFile) {
                const jwt = window.__BACKEND_JWT__;
                if (!jwt) throw new Error("Not authenticated");

                setIsUploadingAvatar(true);
                const formData = new FormData();
                formData.append("image", avatarFile);

                const avatarResponse = await fetch(
                    `${CONFIG.SFU_SERVER_URL}/api/users/me/avatar`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${jwt}` },
                        body: formData,
                    },
                );

                const avatarBody = await avatarResponse.json().catch(() => ({}));
                if (!avatarResponse.ok) {
                    throw new Error(
                        avatarBody?.error || `Avatar upload failed: ${avatarResponse.status}`,
                    );
                }

                const avatarUrl: string = avatarBody.avatarUrl;
                updateUser({ image: avatarUrl });
                if (window.__BACKEND_USER__) {
                    window.__BACKEND_USER__ = {
                        ...window.__BACKEND_USER__,
                        image: avatarUrl,
                    };
                }
                setAvatarFile(null);
                setAvatarPreview(null);
                setIsUploadingAvatar(false);
            }

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
            setIsUploadingAvatar(false);
        }
    };

    const handleThemeSelect = (nextTheme: ThemeId) => {
        setThemeLocal(nextTheme);
        void persistTheme(nextTheme);
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
                            Avatar
                        </p>

                        <div className="mt-3 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={isUploadingAvatar || isDeletingAvatar}
                                className="group relative h-16 w-16 shrink-0 rounded-full wd-bg-elevated overflow-hidden border wd-border-subtle disabled:opacity-50"
                            >
                                {avatarPreview || user.image ? (
                                    <img
                                        src={avatarPreview || user.image || ""}
                                        alt="Avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="inline-flex h-full w-full items-center justify-center text-lg font-bold wd-text-muted">
                                        {(name || "U").charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                    <ImagePlus size={18} className="text-white" />
                                </span>
                            </button>

                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    disabled={isUploadingAvatar || isDeletingAvatar}
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-md border wd-border-subtle px-3 py-1.5 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
                                >
                                    <ImagePlus size={14} />
                                    {user.image || avatarPreview ? "Change Avatar" : "Upload Avatar"}
                                </button>

                                {user.image && !avatarPreview && (
                                    <button
                                        type="button"
                                        disabled={isUploadingAvatar || isDeletingAvatar}
                                        onClick={handleDeleteAvatar}
                                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
                                    >
                                        {isDeletingAvatar ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Removing...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={14} />
                                                Remove Avatar
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={handleAvatarFileSelect}
                        />

                        <p className="mt-2 text-[10px] wd-text-muted">
                            PNG, JPEG, WebP, or GIF. Max 5MB.
                        </p>
                    </div>

                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Profile Preview
                        </p>
                        <p className="mt-1 text-lg font-semibold wd-text-primary truncate">
                            {previewName}
                        </p>
                    </div>

                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Theming
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            {THEME_OPTIONS.map((option) => {
                                const isSelected = theme === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleThemeSelect(option.id)}
                                        title={option.description}
                                        aria-label={`Select ${option.label} theme`}
                                        className="group rounded-md border border-transparent p-1.5 transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                    >
                                        <span className="block text-[11px] font-semibold wd-text-secondary">
                                            {option.label}
                                        </span>
                                        <span
                                            className={`relative mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                                                isSelected
                                                    ? "outline outline-2 outline-offset-2 outline-[var(--wd-accent)]"
                                                    : "border-[var(--wd-border-subtle)]"
                                            }`}
                                            style={{
                                                backgroundColor: `rgb(${option.swatch.base})`,
                                                borderColor: `rgb(${option.swatch.accent})`,
                                            }}
                                        >
                                            <span
                                                className="pointer-events-none absolute inset-[7px] rounded-full"
                                                style={{
                                                    backgroundColor: `rgb(${option.swatch.surface})`,
                                                }}
                                            />
                                            {isSelected && (
                                                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wd-accent)] text-white">
                                                    <Check size={11} />
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {isThemeSyncing && (
                            <p className="mt-2 text-xs wd-text-muted">
                                Saving theme preference...
                            </p>
                        )}
                        {themeSyncError && (
                            <p className="mt-2 text-xs wd-text-warning">
                                Theme saved locally. Cloud sync failed: {themeSyncError}
                            </p>
                        )}
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
