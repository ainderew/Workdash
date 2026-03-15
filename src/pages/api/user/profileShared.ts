import { CONFIG } from "@/common/utils/config";

export const MAX_NAME_LENGTH = 20;
export const MAX_NICKNAME_LENGTH = 20;

export type UserProfilePatchInput = {
    name: string;
    nickname?: string | null;
};

export type InputValidationResult =
    | { ok: true; input: UserProfilePatchInput }
    | { ok: false; status: number; error: string };

const normalizeString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

export const validateUserProfilePatchInput = (
    rawInput: unknown,
): InputValidationResult => {
    if (!rawInput || typeof rawInput !== "object") {
        return {
            ok: false,
            status: 400,
            error: "Invalid request body",
        };
    }

    const body = rawInput as Record<string, unknown>;
    const normalizedName = normalizeString(body.name);
    if (!normalizedName) {
        return {
            ok: false,
            status: 400,
            error: "Name cannot be empty",
        };
    }
    if (normalizedName.length > MAX_NAME_LENGTH) {
        return {
            ok: false,
            status: 400,
            error: `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
        };
    }

    if (!Object.prototype.hasOwnProperty.call(body, "nickname")) {
        return {
            ok: true,
            input: {
                name: normalizedName,
            },
        };
    }

    const nicknameInput = body.nickname;
    if (nicknameInput === null || nicknameInput === undefined) {
        return {
            ok: true,
            input: {
                name: normalizedName,
                nickname: null,
            },
        };
    }

    const normalizedNickname = normalizeString(nicknameInput);
    if (!normalizedNickname) {
        return {
            ok: true,
            input: {
                name: normalizedName,
                nickname: null,
            },
        };
    }

    if (normalizedNickname.length > MAX_NICKNAME_LENGTH) {
        return {
            ok: false,
            status: 400,
            error: `Nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer`,
        };
    }

    return {
        ok: true,
        input: {
            name: normalizedName,
            nickname: normalizedNickname,
        },
    };
};

const parseBackendResponseBody = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { error: text };
    }
};

export const patchBackendUserProfile = async (
    token: string,
    input: UserProfilePatchInput,
) => {
    const profileResponse = await fetch(`${CONFIG.INTERNAL_SFU_URL}/api/user/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
    });

    if (profileResponse.ok) {
        const profileBody = await parseBackendResponseBody(profileResponse);
        return {
            status: profileResponse.status,
            body: profileBody,
        };
    }

    // Compatibility fallback for older backend versions that only expose update-name.
    if (profileResponse.status === 404) {
        const fallbackResponse = await fetch(
            `${CONFIG.INTERNAL_SFU_URL}/api/user/update-name`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: input.name }),
            },
        );
        const fallbackBody = await parseBackendResponseBody(fallbackResponse);
        return {
            status: fallbackResponse.status,
            body: fallbackBody,
        };
    }

    const profileBody = await parseBackendResponseBody(profileResponse);
    return {
        status: profileResponse.status,
        body: profileBody,
    };
};

