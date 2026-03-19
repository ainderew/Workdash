import React from "react";
import Image from "next/image";
import type { ChatV2CharacterCustomization } from "@/communication/chatV2/_types";
import { useCharacterFaceAvatar } from "@/common/utils/characterFaceAvatar";

interface UserAvatarProps {
    name: string;
    image?: string | null;
    characterCustomization?: ChatV2CharacterCustomization | null;
    spriteStyle?: React.CSSProperties | null;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    onImageError?: () => void;
}

const sizeClasses = {
    xs: "h-7 w-7 text-[11px]",
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-[10px]",
    lg: "h-11 w-11 text-[0.85rem]",
    xl: "h-16 w-16 text-xl",
} as const;

function UserAvatar({
    name,
    image,
    characterCustomization,
    spriteStyle,
    size = "md",
    className,
    onImageError,
}: UserAvatarProps) {
    const imageUrl = image?.trim() || "";
    const faceDataUrl = useCharacterFaceAvatar(imageUrl ? null : (characterCustomization ?? null));

    return (
        <div
            className={`relative shrink-0 rounded-full wd-bg-elevated wd-text-secondary flex items-center justify-center font-semibold overflow-hidden border wd-border-subtle ${sizeClasses[size]} ${className ?? ""}`}
        >
            {imageUrl ? (
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    unoptimized
                    className="object-cover"
                    onError={onImageError}
                />
            ) : spriteStyle ? (
                <div
                    className="w-full h-full bg-no-repeat"
                    style={spriteStyle}
                />
            ) : faceDataUrl ? (
                <Image
                    src={faceDataUrl}
                    alt={name}
                    fill
                    unoptimized
                    className="object-cover [image-rendering:pixelated]"
                />
            ) : (
                <span>{name.charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}

export default UserAvatar;
