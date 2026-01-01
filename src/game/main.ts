import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { AUTO, Game } from "phaser";
import { MainMap } from "./scenes/MainMap";
import { SoccerMap } from "./scenes/SoccerMap";

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: "game-container",
    backgroundColor: "#49A841",
    title: "WorkDash",
    disableContextMenu: true,

    scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "game-container",
        width: "100%",
        height: "100%",
    },
    scene: [Boot, Preloader, MainMap, SoccerMap],
    pixelArt: true,
    antialias: false,
    roundPixels: true,

    audio: {
        disableWebAudio: false,
        noAudio: false,
    },

    physics: {
        default: "arcade",
        arcade: {
            debug: true,
            debugShowBody: true,
            gravity: { x: 0, y: 0 },
            tileBias: 48,
        },
    },
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
