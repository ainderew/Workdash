import usePlayersStore from "@/common/store/playerStore";
import { Player } from "@/game/player/player";
import React from "react";

function ReactionToast() {
    const playerMap: Record<string, Player> = usePlayersStore(
        (state) => state.playerMap,
    );

    return (
        <div className="reaction-toast-container absolute right-4 top-4 z-50 flex flex-col items-end gap-2 grow-0">
            {Object.values(playerMap).map(
                (player) =>
                    player.isRaisingHand && (
                        <div
                            key={player.id}
                            className="reaction-toast-item px-4 py-2 rounded-md w-fit bg-[var(--wd-warning-soft)] text-[var(--wd-warning)] border border-[var(--wd-warning)]"
                        >
                            <span className="text-sm">
                                {player.name === "You"
                                    ? "You're raising your hand ✋"
                                    : player.name + " is raising their hand ✋"}
                            </span>
                        </div>
                    ),
            )}
        </div>
    );
}

export default ReactionToast;
