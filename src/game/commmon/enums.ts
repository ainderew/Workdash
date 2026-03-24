export enum SpriteKeys {
    ADAM = "ADAM",

    ADAM_ATTACK = "adam-attack",
    ADAM_WALK = "adam-walk",
    ADAM_IDLE = "adam-idle",
}

export const AttackAnimationKeys: { [key: string]: string } = {
    ADAM: "adam-attack",
};

export const WalkAnimationKeys: { [key: string]: string } = {
    ADAM: "adam-walk",
    ADAM_UP: "adam-walk-up",
    ADAM_DOWN: "adam-walk-down",
};

export const IdleAnimationKeys: { [key: string]: string } = {
    ADAM: "adam-idle",
};
