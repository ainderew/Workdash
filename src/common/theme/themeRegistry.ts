import {
    DEFAULT_THEME_ID,
    THEME_IDS,
    ThemeDefinition,
    ThemeId,
} from "@/common/theme/_types";

const THEME_REGISTRY: Record<ThemeId, ThemeDefinition> = {
    den: {
        id: "den",
        label: "Den",
        description: "Cozy gamer den — warm charcoal with amber lamplight",
        swatch: {
            base: "24 18 16",
            surface: "29 21 17",
            accent: "240 163 94",
        },
    },
    classic: {
        id: "classic",
        label: "Classic",
        description: "High-contrast light theme",
        swatch: {
            base: "255 255 255",
            surface: "241 245 249",
            accent: "37 99 235",
        },
    },
    cyber: {
        id: "cyber",
        label: "Cyber",
        description: "Midnight blue with violet accent",
        swatch: {
            base: "2 6 23",
            surface: "30 41 59",
            accent: "168 85 247",
        },
    },
    eco: {
        id: "eco",
        label: "Eco",
        description: "Warm neutral with green accent",
        swatch: {
            base: "250 250 249",
            surface: "231 229 228",
            accent: "21 128 61",
        },
    },
    a11y: {
        id: "a11y",
        label: "A11y",
        description: "OLED black with strong yellow contrast",
        swatch: {
            base: "0 0 0",
            surface: "38 38 38",
            accent: "234 179 8",
        },
    },
    discord: {
        id: "discord",
        label: "Discord",
        description: "Discord-inspired off-black",
        swatch: {
            base: "49 51 56",
            surface: "43 45 49",
            accent: "88 101 242",
        },
    },
    "discord-classic": {
        id: "discord-classic",
        label: "Discord Classic",
        description: "Classic Discord warm dark theme",
        swatch: {
            base: "54 57 63",
            surface: "47 49 54",
            accent: "88 101 242",
        },
    },
};

export const THEME_OPTIONS: ThemeDefinition[] = THEME_IDS.map((id) => {
    return THEME_REGISTRY[id];
});

export const getThemeDefinition = (id: ThemeId): ThemeDefinition => {
    return THEME_REGISTRY[id];
};

export const isDefaultTheme = (id: ThemeId): boolean => {
    return id === DEFAULT_THEME_ID;
};
