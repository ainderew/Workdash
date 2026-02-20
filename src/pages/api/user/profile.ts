import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import {
    patchBackendUserProfile,
    validateUserProfilePatchInput,
} from "./profileShared";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await getServerSession(req, res, authOptions);
    const token = session?.backendJwt;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const validation = validateUserProfilePatchInput(req.body);
    if (!validation.ok) {
        return res.status(validation.status).json({ error: validation.error });
    }

    try {
        const result = await patchBackendUserProfile(token, validation.input);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error("Failed to patch user profile", error);
        return res.status(500).json({ error: "Failed to update user profile" });
    }
}

