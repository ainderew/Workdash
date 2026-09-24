import { Scene } from "phaser";
import { SpriteKeys } from "../commmon/enums";
import { EventBus } from "../EventBus";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    preload() {
        // Progress is drawn over the canvas by the React WorldLoadingScreen
        this.load.on("progress", (value: number) => {
            EventBus.emit("world-load-progress", value);
        });

        this.load.on("complete", () => {
            EventBus.emit("world-load-progress", 1);
            this.scene.start("MainMap");
        });

        this.loadGameAssets();
    }

    private loadGameAssets() {
        this.load.setPath("/assets");

        
        

        

        this.load.image(
            "Office",
            "tile-sets/Modern_Office_Shadowless_32x32.png",
        );
        this.load.image(
            "Exterior",
            "tile-sets/Modern_Exteriors_Complete_Tileset_32x32.png",
        );
        this.load.image("Interior_2", "tile-sets/Room_Builder_32x32.png");
        for (let i = 0; i < 9; i++) {
            this.load.image(
                `Interior_Tile_${i}`,
                `tile-sets/Interiors_32x32_part_${i}.png`,
            );
        }
        //Animated Tileset
        this.load.spritesheet(
            "Sliding_Door",
            "tile-sets/animated_door_glass_sliding_32x32.png",
            { frameWidth: 64, frameHeight: 64 },
        );
        this.load.spritesheet(
            "Animated_Coffee",
            "tile-sets/animated_coffee_32x32.png",
            { frameWidth: 32, frameHeight: 64 },
        );
        this.load.spritesheet(
            "Animated_Control_Panel",
            "tile-sets/animated_control_room_screens_32x32.png",
            { frameWidth: 128, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Fish_Tank",
            "tile-sets/animated_fishtank_red_32x32.png",
            { frameWidth: 64, frameHeight: 64 },
        );

        this.load.spritesheet(
            "Animated_Server",
            "tile-sets/animated_control_room_server_32x32.png",
            { frameWidth: 32, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Christmas_Lights",
            "tile-sets/animated_Christmas_tree_lights_32x32.png",
            { frameWidth: 64, frameHeight: 96 },
        );
        this.load.spritesheet(
            "Animated_Clock",
            "tile-sets/animated_cuckoo_clock_32x32.png",
            { frameWidth: 32, frameHeight: 64 },
        );

        this.load.spritesheet(
            "Animated_Fountain",
            "tile-sets/Garden_Fountain_3_32x32.png",
            { frameWidth: 96, frameHeight: 192 },
        );

        // Load sounds (soccer sounds are lazy-loaded in SoccerMap.ts)
        this.load.audio("door_open", "sounds/door_open.mp3");
        this.load.audio("bg_music_1", "sounds/bg_music_1.mp3");
        this.load.audio("kart_start", "sounds/kart.mp3");

        // ?v= breaks browser caches that still hold map1.json from before it
        // was served with revalidation (it used to be cached for 30 days).
        this.load.tilemapTiledJSON("map", "map1.json?v=20260924");

        // Spritesheets
        const loadChar = (k: string, p: string, w: number, h: number) =>
            this.load.spritesheet(k, p, { frameWidth: w, frameHeight: h });
        loadChar(
            SpriteKeys.ADAM_ATTACK,
            "characters/Adam_phone_16x16.png",
            16,
            32,
        );
        loadChar(SpriteKeys.ADAM, "characters/Adam_idle_16x16.png", 16, 32);
        loadChar(
            SpriteKeys.ADAM_WALK,
            "characters/Adam_walk_16x16.png",
            16,
            32,
        );
    }
}
