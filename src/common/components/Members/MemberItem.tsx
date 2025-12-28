import { Player } from "@/game/player/player";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import React, { useMemo } from "react";
import VolumeSlider from "./VolumeSlider";
import usePlayersStore from "@/common/store/playerStore";

function MemberItem({ player }: { player: Player }) {
    const localPlayerId = usePlayersStore((state) => state.localPlayerId);
    const isLocalPlayer = player.id === localPlayerId;

    // Get player's sprite sheet path from Phaser texture
    const avatarBackgroundStyles = useMemo((): React.CSSProperties => {
        try {
            // Access the Phaser texture key
            const textureKey = player.texture?.key;

            if (textureKey && player.scene?.textures?.exists(textureKey)) {
                // Get the texture from Phaser's texture manager
                const texture = player.scene.textures.get(textureKey);
                // Get the source image (the actual sprite sheet)
                const source = texture.getSourceImage() as HTMLImageElement;

                if (source && source.src) {
                    return {
                        backgroundImage: `url('${source.src}')`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "-94px -20px",
                        imageRendering: "pixelated" as const,
                    };
                }
            }
        } catch (error) {
            console.warn("Failed to get player sprite:", error);
        }

        return {};
    }, [player]);

    const getInitials = (name: string) => {
        return name?.charAt(0)?.toUpperCase() || "?";
    };

    const getAvatarColor = (id: string) => {
        const colors = [
            "bg-blue-600",
            "bg-green-600",
            "bg-purple-600",
            "bg-pink-600",
            "bg-orange-600",
            "bg-cyan-600",
        ];
        const index = id
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    return (
        <div className="member-item flex flex-col text-white hover:bg-neutral-600 px-4 py-2 rounded-lg">
            {/* Player info */}
            <div className="flex items-center gap-4">
                <div className="avatar-online-container relative w-8 h-8">
                    <div className="avatar-container overflow-hidden w-8 h-8 bg-center rounded-full aspect-square">
                        <Avatar className="">
                            <div
                                className={`w-full h-full bg-no-repeat ${!avatarBackgroundStyles.backgroundImage ? getAvatarColor(player.id) : ""}`}
                                style={avatarBackgroundStyles}
                            >
                                {!avatarBackgroundStyles.backgroundImage && (
                                    <div className="flex items-center justify-center w-full h-full text-white font-semibold text-sm">
                                        {getInitials(player.name)}
                                    </div>
                                )}
                            </div>
                            <AvatarFallback className="bg-black">
                                {player.name![0]}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="online-indicator w-2 h-2 bg-green-600 rounded-full absolute right-0 bottom-0 outline-neutral-900 outline-3 outline-solid" />
                </div>

                <span className="flex-1">{player.name}</span>

                {isLocalPlayer && (
                    <span className="text-xs text-neutral-400">(You)</span>
                )}
            </div>

            {/* Volume control - always visible for remote users */}
            {!isLocalPlayer && (
                <VolumeSlider userName={player.name!} />
            )}
        </div>
    );
}
export default MemberItem;
