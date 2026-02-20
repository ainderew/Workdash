import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { patchBackendUserProfile } from "./profileShared";

const normalizeName = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
};

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

    const normalizedName = normalizeName(req.body?.name);
    if (!normalizedName) {
        return res.status(400).json({ error: "Name cannot be empty" });
    }

    try {
        const result = await patchBackendUserProfile(token, {
            name: normalizedName,
        });
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error("Failed to patch user name", error);
        return res.status(500).json({ error: "Failed to update user name" });
    }
}

