import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Settings, Trash2, X } from "lucide-react";
import { CONFIG } from "@/common/utils/config";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SERVER_NAME_LENGTH = 100;

interface ServerSettingsModalProps {
    isOpen: boolean;
    serverId: string | null;
    serverName: string;
    currentImageUrl: string | null;
    onClose: () => void;
    onImageChanged: (serverId: string, imageUrl: string | null) => void;
    onServerRenamed?: (serverId: string, name: string) => void;
}

function ServerSettingsModal({
    isOpen,
    serverId,
    serverName,
    currentImageUrl,
    onClose,
    onImageChanged,
    onServerRenamed,
}: ServerSettingsModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editName, setEditName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditName(serverName);
        } else {
            setPreviewUrl(null);
            setSelectedFile(null);
            setError(null);
            setIsUploading(false);
            setIsDeleting(false);
            setIsRenaming(false);
        }
    }, [isOpen, serverName]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === "Escape" &&
                !isUploading &&
                !isDeleting &&
                !isRenaming
            ) {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, isUploading, isDeleting, isRenaming, onClose]);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            const file = event.target.files?.[0];
            if (!file) return;

            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(
                    "Invalid file type. Allowed: PNG, JPEG, WebP, GIF",
                );
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                setError("File size exceeds 5MB limit");
                return;
            }

            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        },
        [],
    );

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleUpload = async () => {
        if (!selectedFile || !serverId) return;

        setIsUploading(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const formData = new FormData();
            formData.append("image", selectedFile);

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/image`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${jwt}` },
                    body: formData,
                },
            );

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    body?.error || `Upload failed: ${response.status}`,
                );
            }

            onImageChanged(serverId, body.imageUrl);
            onClose();
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Failed to upload image",
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!serverId || !currentImageUrl) return;

        setIsDeleting(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/image`,
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

            onImageChanged(serverId, null);
            onClose();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Failed to delete image",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRename = async () => {
        if (!serverId) return;
        const trimmed = editName.trim();
        if (!trimmed || trimmed === serverName) return;

        setIsRenaming(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/name`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name: trimmed }),
                },
            );

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    body?.error || `Rename failed: ${response.status}`,
                );
            }

            onServerRenamed?.(serverId, body.name);
            onClose();
        } catch (renameError) {
            setError(
                renameError instanceof Error
                    ? renameError.message
                    : "Failed to rename server",
            );
        } finally {
            setIsRenaming(false);
        }
    };

    if (!isOpen || !serverId) return null;

    const displayImage = previewUrl || currentImageUrl;
    const isBusy = isUploading || isDeleting || isRenaming;
    const nameChanged = editName.trim() !== serverName && editName.trim().length > 0;
    const hasUnsavedChanges = !!selectedFile || nameChanged;

    return (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
                <div className="relative h-24 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
                    <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                        <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
                                <Settings
                                    size={15}
                                    className="wd-text-secondary"
                                />
                            </span>
                            <div>
                                <p className="text-sm font-semibold wd-text-primary">
                                    Server Settings
                                </p>
                                <p className="text-xs wd-text-muted truncate max-w-[200px]">
                                    {serverName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            aria-label="Close server settings"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Server Name
                        </p>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={MAX_SERVER_NAME_LENGTH}
                            disabled={isBusy}
                            className="mt-1.5 h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
                        />
                    </div>

                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Server Image
                        </p>

                        <div className="mt-3 flex items-center gap-4">
                            <div className="relative h-16 w-16 shrink-0 rounded-lg wd-bg-elevated overflow-hidden border wd-border-subtle">
                                {displayImage ? (
                                    <img
                                        src={displayImage}
                                        alt={serverName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="inline-flex h-full w-full items-center justify-center text-lg font-bold wd-text-muted">
                                        {serverName
                                            .trim()
                                            .charAt(0)
                                            .toUpperCase() || "S"}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="inline-flex items-center gap-2 rounded-md border wd-border-subtle px-3 py-1.5 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
                                >
                                    <ImagePlus size={14} />
                                    {currentImageUrl || previewUrl
                                        ? "Change Image"
                                        : "Upload Image"}
                                </button>

                                {currentImageUrl && !previewUrl && (
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={handleDelete}
                                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                                Removing...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={14} />
                                                Remove Image
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <p className="mt-2 text-[10px] wd-text-muted">
                            PNG, JPEG, WebP, or GIF. Max 5MB.
                        </p>
                    </div>

                    {error && (
                        <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-sm wd-text-danger">
                            {error}
                        </p>
                    )}

                    {hasUnsavedChanges && (
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    setEditName(serverName);
                                    setError(null);
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                    }
                                }}
                                disabled={isBusy}
                                className="h-9 rounded-md border wd-border-subtle px-3 text-sm wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (selectedFile) await handleUpload();
                                    if (nameChanged) await handleRename();
                                }}
                                disabled={isBusy}
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-sm font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
                            >
                                {isBusy ? (
                                    <>
                                        <Loader2
                                            size={14}
                                            className="animate-spin"
                                        />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ServerSettingsModal;
