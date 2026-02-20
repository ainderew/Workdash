import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import {
    getBackendUserSettings,
    patchBackendUserSettings,
    validateThemeSettingsPatchInput,
} from "./settingsShared";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET" && req.method !== "PATCH") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await getServerSession(req, res, authOptions);
    const token = session?.backendJwt;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        if (req.method === "GET") {
            const result = await getBackendUserSettings(token);
            return res.status(result.status).json(result.body);
        }

        const validation = validateThemeSettingsPatchInput(req.body);
        if (!validation.ok) {
            return res.status(validation.status).json({ error: validation.error });
        }

        const result = await patchBackendUserSettings(token, validation.input);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error("Failed to handle user settings request", error);
        return res.status(500).json({ error: "Failed to handle settings request" });
    }
}
