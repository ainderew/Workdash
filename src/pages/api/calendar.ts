import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { google } from "googleapis";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.accessToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
        const dateParam = req.query.date as string;
        const targetDate = dateParam ? parseISO(dateParam) : new Date();
        const timeMin = startOfDay(targetDate).toISOString();
        const timeMax = endOfDay(targetDate).toISOString();

        const events = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin,
            timeMax: timeMax,
            maxResults: 50,
            singleEvents: true,
            orderBy: "startTime",
        });

        return res.status(200).json(events.data.items);
    } catch (error) {
        console.error("Calendar API error:", error);
        return res.status(500).json({ error: "Failed to fetch calendar" });
    }
}
