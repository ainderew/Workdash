import { Scene } from "phaser";

/**
 * Handles loading all Character_Generator 32x32 assets
 * Manages complex naming patterns for hairstyles, outfits, and accessories
 */
export class CharacterAssetLoader {
    private scene: Scene;
    private basePath = "/characters/Character_Generator";

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Loads all Character_Generator 32x32 assets
     * Call this from Preloader scene
     */
    loadAllCharacterAssets(): void {
        this.loadAdultBodies();
        this.loadAdultEyes();
        this.loadAdultHairstyles();
        this.loadAdultOutfits();

        this.loadKidBodies();
        this.loadKidEyes();
        this.loadKidHairstyles();
        this.loadKidOutfits();

        // Accessories and items are shared between adult and kid
        this.loadAccessories();
        this.loadSmartphones();
        this.loadBooks();
    }

    private loadAdultBodies(): void {
        // Adult bodies: Body_32x32_01.png through Body_32x32_09.png
        for (let i = 1; i <= 9; i++) {
            const id = String(i).padStart(2, "0");
            this.scene.load.image(
                `body-adult-${i}`,
                `${this.basePath}/Bodies/32x32/Body_32x32_${id}.png`,
            );
        }
    }

    private loadAdultEyes(): void {
        // Adult eyes: Eyes_32x32_01.png through Eyes_32x32_07.png
        for (let i = 1; i <= 7; i++) {
            const id = String(i).padStart(2, "0");
            this.scene.load.image(
                `eyes-adult-${i}`,
                `${this.basePath}/Eyes/32x32/Eyes_32x32_${id}.png`,
            );
        }
    }

    private loadAdultHairstyles(): void {
        // Hairstyles: Hairstyle_XX_32x32_YY.png
        // 29 styles × 7 colors = 203 variations (some styles may have fewer colors)
        // Pattern: Hairstyle_01_32x32_01.png through Hairstyle_29_32x32_07.png

        let hairstyleIndex = 1;
        for (let style = 1; style <= 29; style++) {
            const styleNum = String(style).padStart(2, "0");

            for (let color = 1; color <= 7; color++) {
                const colorNum = String(color).padStart(2, "0");
                const filename = `Hairstyle_${styleNum}_32x32_${colorNum}.png`;

                this.scene.load.image(
                    `hairstyle-adult-${hairstyleIndex}`,
                    `${this.basePath}/Hairstyles/32x32/${filename}`,
                );

                hairstyleIndex++;
            }
        }
    }

    private loadAdultOutfits(): void {
        // Outfits: Outfit_XX_32x32_YY.png
        // 10 designs with variable color variants
        // Pattern: Outfit_01_32x32_01.png through Outfit_10_32x32_YY.png

        let outfitIndex = 1;

        // Outfit counts per design (approximate based on exploration)
        const outfitVariants = [10, 4, 4, 2, 3, 2, 5, 5, 18, 79];

        for (let design = 1; design <= 10; design++) {
            const designNum = String(design).padStart(2, "0");
            const variantCount = outfitVariants[design - 1] || 10;

            for (let variant = 1; variant <= variantCount; variant++) {
                const variantNum = String(variant).padStart(2, "0");
                const filename = `Outfit_${designNum}_32x32_${variantNum}.png`;

                this.scene.load.image(
                    `outfit-adult-${outfitIndex}`,
                    `${this.basePath}/Outfits/32x32/${filename}`,
                );

                outfitIndex++;
            }
        }
    }

    private loadKidBodies(): void {
        // Kid bodies: Body_1_kid_32x32.png through Body_4_kid_32x32.png
        for (let i = 1; i <= 4; i++) {
            this.scene.load.image(
                `body-kid-${i}`,
                `${this.basePath}/Bodies_kids/32x32/Body_${i}_kid_32x32.png`,
            );
        }
    }

    private loadKidEyes(): void {
        // Kid eyes: Eyes_kids_32x32_1.png through Eyes_kids_32x32_6.png
        for (let i = 1; i <= 6; i++) {
            this.scene.load.image(
                `eyes-kid-${i}`,
                `${this.basePath}/Eyes_kids/32x32/Eyes_kids_32x32_${i}.png`,
            );
        }
    }

    private loadKidHairstyles(): void {
        // Kid hairstyles: Hairstyle_kid_X_32x32_Y.png
        // 6 styles × 5 colors = 30 variations

        let hairstyleIndex = 1;
        for (let style = 1; style <= 6; style++) {
            for (let color = 1; color <= 5; color++) {
                const filename = `Hairstyle_kid_${style}_32x32_${color}.png`;

                this.scene.load.image(
                    `hairstyle-kid-${hairstyleIndex}`,
                    `${this.basePath}/Hairstyles_kids/32x32/${filename}`,
                );

                hairstyleIndex++;
            }
        }
    }

    private loadKidOutfits(): void {
        // Kid outfits: Outfit_kid_1.png through Outfit_kid_7_pajama_tiger.png
        // Simpler naming scheme than adult outfits
        const kidOutfitFiles = [
            "Outfit_kid_1.png",
            "Outfit_kid_2.png",
            "Outfit_kid_3.png",
            "Outfit_kid_4_pajama_dog.png",
            "Outfit_kid_5_pajama_bunny.png",
            "Outfit_kid_6_pajama_bear.png",
            "Outfit_kid_7_pajama_tiger.png",
        ];

        kidOutfitFiles.forEach((filename, index) => {
            this.scene.load.image(
                `outfit-kid-${index + 1}`,
                `${this.basePath}/Outfits_kids/32x32/${filename}`,
            );
        });
    }

    private loadAccessories(): void {
        // Accessories have various naming patterns by type
        // For MVP, load the most common ones
        // Full implementation would need to catalog all accessory files

        const accessoryTypes = [
            { prefix: "Ladybug", count: 4 },
            { prefix: "Bee", count: 3 },
            { prefix: "Backpack", count: 10 },
            { prefix: "Snapback", count: 6 },
            { prefix: "Dino_Snapback", count: 3 },
            { prefix: "Policeman_Hat", count: 6 },
            { prefix: "Bataclava", count: 3 },
            { prefix: "Detective_Hat", count: 3 },
            { prefix: "Zombie_Brain", count: 3 },
            { prefix: "Bolt", count: 3 },
        ];

        let accessoryIndex = 1;

        accessoryTypes.forEach(({ prefix, count }) => {
            for (let i = 1; i <= count; i++) {
                const num = String(i).padStart(2, "0");
                // Pattern: Accessory_01_Ladybug_32x32_01.png
                const accessoryNum = String(accessoryIndex).padStart(2, "0");

                this.scene.load.image(
                    `accessory-${accessoryIndex}`,
                    `${this.basePath}/Accessories/32x32/Accessory_${accessoryNum}_${prefix}_32x32_${num}.png`,
                );

                accessoryIndex++;
            }
        });
    }

    private loadSmartphones(): void {
        // Smartphones: Smartphone_32x32_1.png through Smartphone_32x32_5.png
        for (let i = 1; i <= 5; i++) {
            this.scene.load.image(
                `smartphone-${i}`,
                `${this.basePath}/Smartphones/32x32/Smartphone_32x32_${i}.png`,
            );
        }
    }

    private loadBooks(): void {
        // Books: Book_32x32_01.png through Book_32x32_06.png
        for (let i = 1; i <= 6; i++) {
            const num = String(i).padStart(2, "0");
            this.scene.load.image(
                `book-${i}`,
                `${this.basePath}/Books/32x32/Book_32x32_${num}.png`,
            );
        }
    }
}
