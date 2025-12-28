import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { Game as GameScene } from "./scenes/Game";
import { AUTO, Game } from "phaser";
import { NeuralCanvasScene } from "./scenes/NeuralCanvasScene";

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: "game-container",
    backgroundColor: "#000",
    title: "WorkDash",
    disableContextMenu: true,

    scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "game-container",
        width: "100%",
        height: "100%",
    },
    scene: [Boot, NeuralCanvasScene, Preloader, GameScene],
    pixelArt: true,
    antialias: false,
    roundPixels: true,

    physics: {
        default: "arcade",
        arcade: {
            debug: false,
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
