import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logger } from "@/common/utils/logger";

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
}

function useCalendar(selectedDate: Date) {
    const { data: session } = useSession();
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        if (!session) {
            setCalendarEvents([]);
            return;
        }

        if (session.error === "RefreshAccessTokenError") {
            // One toast however often the session refetches
            toast("Google Calendar", {
                id: "google-calendar-reconnect",
                description: "Your Google connection expired. Sign in again to see your events.",
                action: {
                    label: "Reconnect",
                    onClick: () => signIn("google"),
                },
            });

            return;
        }

        // Email (magic link) sign-ins have no Google token: nothing to fetch
        if (!session.accessToken) {
            setCalendarEvents([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");

            const res = await fetch(`/api/calendar?date=${dateStr}`);

            if (!res.ok) {
                toast("Google Calendar", {
                    description: "Something went wrong",
                });
                return;
            }

            const events = await res.json();
            logger.log("Calendar events:", events);
            setCalendarEvents(events);
        } catch (err) {
            console.error("Calendar fetch error:", err);
            setError(
                err instanceof Error ? err.message : "Failed to fetch calendar",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [session, selectedDate]); // Re-fetch when date changes

    return {
        calendarEvents,
        loading,
        error,
        fetchEvents,
    };
}

export default useCalendar;
