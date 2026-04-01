import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import { ReactionEventEnums } from "./_enums";
import usePlayersStore from "@/common/store/playerStore";
import useCallReactionStore from "@/common/store/callReactionStore";
import { ReactionData } from "./_types";

export class ReactionService {
    public static instance: ReactionService;
    private sfuService: MediaTransportService;
    public uiUpdater: ((emojiData: ReactionData) => void) | null = null;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new ReactionService();
        }
        return this.instance;
    }

    public setupReactionListener() {
        this.sfuService.socket?.on(
            ReactionEventEnums.NEW_REACTION,
            (emojiData: ReactionData) => this.routeReactionToPlayer(emojiData),
        );
    }

    public sendReaction(emojiData: ReactionData) {
        this.sfuService.socket?.emit(
            ReactionEventEnums.SEND_REACTION,
            emojiData,
        );
    }

    public routeReactionToPlayer(reactionData: ReactionData) {
        const { playerId, reaction, userId } = reactionData;
        if (reaction === "🥷") {
            const audio = new Audio("/assets/sounds/ninja-sound-effect.mp3");
            audio.play();
        }

        if (reaction === "🤚") {
            const audio = new Audio("/assets/sounds/pop.mp3");
            audio.play();

            usePlayersStore
                .getState()
                .updatePlayerMap(playerId, { isRaisingHand: true });
        }

        if (reaction === "stop-raise-hand") {
            usePlayersStore
                .getState()
                .updatePlayerMap(playerId, { isRaisingHand: false });
        }

        // World mode: route to Phaser player sprite
        const players = usePlayersStore.getState().playerMap;
        players[playerId]?.showReactionTag(reactionData);

        // Desk mode: route to callReactionStore when userId is present
        if (userId !== undefined) {
            const store = useCallReactionStore.getState();
            if (reaction === "🤚") {
                store.setHandRaised(userId, true);
            } else if (reaction === "stop-raise-hand") {
                store.setHandRaised(userId, false);
            } else {
                store.addReaction(userId, reaction);
            }
        }
    }
}
