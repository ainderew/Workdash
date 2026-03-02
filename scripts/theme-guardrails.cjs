#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const TARGETS = [
    "src/App.tsx",
    "src/pages/app.tsx",
    "src/common",
    "src/components/ui",
];

const EXTENSIONS = new Set([".ts", ".tsx"]);

const HEX_ALLOWLIST = new Set([
    "src/common/components/CharacterCreation/SpriteFramePreview.tsx",
    "src/common/components/DeskMode/ChannelSidebar.tsx",
    "src/common/components/DeskMode/MessageList.tsx",
    "src/common/components/DeskMode/modals/ChannelPermissionsModal.tsx",
    "src/common/components/DeskMode/modals/ServerSettingsModal.tsx",
    "src/common/components/DeskMode/modals/UserSettingsModal.tsx",
    "src/common/components/Google/GoogleCalendarButton.tsx",
    "src/common/components/Soccer/SkillSelectionOverlay.tsx",
    "src/common/components/Soccer/SkillsHud.tsx",
    "src/common/components/Soccer/SoccerScoreboard.tsx",
]);

const SEMANTIC_ENFORCED_PREFIXES = [
    "src/App.tsx",
    "src/pages/app.tsx",
    "src/components/ui/",
    "src/common/components/DeskMode/modals/",
];

const DARK_VARIANT_REGEX = /\bdark:[^\s"'`]+/g;
const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{3,8}\b/g;
const PALETTE_UTILITY_REGEX =
    /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[^\s"'`]+/g;

const toPosix = (inputPath) => inputPath.split(path.sep).join("/");

const resolveTargetFiles = () => {
    const files = [];

    const walk = (absolutePath) => {
        const stats = fs.statSync(absolutePath);
        if (stats.isFile()) {
            if (EXTENSIONS.has(path.extname(absolutePath))) {
                files.push(absolutePath);
            }
            return;
        }

        for (const entry of fs.readdirSync(absolutePath)) {
            walk(path.join(absolutePath, entry));
        }
    };

    for (const target of TARGETS) {
        const absoluteTarget = path.join(process.cwd(), target);
        if (!fs.existsSync(absoluteTarget)) continue;
        walk(absoluteTarget);
    }

    return files;
};

const getLineNumber = (source, index) => {
    let line = 1;
    for (let cursor = 0; cursor < index; cursor += 1) {
        if (source[cursor] === "\n") line += 1;
    }
    return line;
};

const isSemanticEnforcedFile = (relativePath) => {
    return SEMANTIC_ENFORCED_PREFIXES.some((prefix) => {
        if (prefix.endsWith("/")) return relativePath.startsWith(prefix);
        return relativePath === prefix;
    });
};

const collectMatches = (source, regex) => {
    const localRegex = new RegExp(regex.source, "g");
    const matches = [];
    let next = localRegex.exec(source);
    while (next) {
        matches.push({
            value: next[0],
            index: next.index,
        });
        next = localRegex.exec(source);
    }
    return matches;
};

const violations = [];
const files = resolveTargetFiles();

for (const filePath of files) {
    const relativePath = toPosix(path.relative(process.cwd(), filePath));
    const source = fs.readFileSync(filePath, "utf8");

    for (const match of collectMatches(source, DARK_VARIANT_REGEX)) {
        violations.push({
            rule: "No dark variant in app scope",
            file: relativePath,
            line: getLineNumber(source, match.index),
            value: match.value,
        });
    }

    if (!HEX_ALLOWLIST.has(relativePath)) {
        for (const match of collectMatches(source, HEX_COLOR_REGEX)) {
            violations.push({
                rule: "No hardcoded hex colors in app scope",
                file: relativePath,
                line: getLineNumber(source, match.index),
                value: match.value,
            });
        }
    }

    if (isSemanticEnforcedFile(relativePath)) {
        for (const match of collectMatches(source, PALETTE_UTILITY_REGEX)) {
            violations.push({
                rule: "Use semantic utility classes for color styling",
                file: relativePath,
                line: getLineNumber(source, match.index),
                value: match.value,
            });
        }
    }
}

if (violations.length > 0) {
    console.error("\nTheme guardrail violations:\n");
    for (const violation of violations) {
        console.error(
            `- [${violation.rule}] ${violation.file}:${violation.line} => ${violation.value}`,
        );
    }
    process.exit(1);
}

console.log("Theme guardrails passed.");
