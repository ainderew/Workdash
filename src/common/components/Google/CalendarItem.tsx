import React from "react";
import { parseISO, format, differenceInMinutes, startOfDay } from "date-fns";
import { Video } from "lucide-react";

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
    conferenceData?: {
        entryPoints?: Array<{
            entryPointType: string;
            uri: string;
            label?: string;
        }>;
    };
    hangoutLink?: string;
}

interface CalendarItemProps {
    event: CalendarEvent;
}

export default function CalendarItem({ event }: CalendarItemProps) {
    const isAllDay = !event.start.dateTime && event.start.date;

    if (isAllDay) {
        return null;
    }

    const getVideoLink = () => {
        if (event.conferenceData?.entryPoints) {
            const videoEntry = event.conferenceData.entryPoints.find(
                (entry) => entry.entryPointType === "video",
            );
            if (videoEntry) return videoEntry.uri;
        }

        if (event.hangoutLink) return event.hangoutLink;

        return null;
    };

    const videoLink = getVideoLink();

    const getEventPosition = () => {
        const start = parseISO(event.start.dateTime!);
        const end = parseISO(event.end.dateTime!);
        const dayStart = startOfDay(start);

        const minutesFromStart = differenceInMinutes(start, dayStart);
        const topPosition = (minutesFromStart / 60) * 80;

        const durationMinutes = differenceInMinutes(end, start);
        const height = (durationMinutes / 60) * 80;

        return { top: topPosition, height };
    };
    const { top, height } = getEventPosition();
    const startTime = parseISO(event.start.dateTime!);
    const endTime = parseISO(event.end.dateTime!); 

    const handleClick = () => {
        if (videoLink) {
            window.open(videoLink, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`absolute left-2 right-2 rounded-lg p-2 overflow-hidden border-l-4 transition-all ${
                videoLink
                    ? "bg-blue-500 border-blue-600 hover:bg-blue-600 cursor-pointer"
                    : "bg-orange-500 border-orange-600 hover:bg-orange-600"
            }`}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                minHeight: "50px",
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        {videoLink && (
                            <Video size={14} className="flex-shrink-0" />
                        )}
                        <span className="font-semibold text-sm truncate">
                            {event.summary}
                        </span>
                    </div>
                    {/* Show both start and end time */}
                    <div className="text-xs opacity-90 mt-0.5">
                        {format(startTime, "h:mm a")} -{" "}
                        {format(endTime, "h:mm a")}
                    </div>
                    {event.location && height > 60 && (
                        <div className="text-xs opacity-75 truncate mt-1">
                            📍 {event.location}
                        </div>
                    )}
                </div>
                {videoLink && (
                    <div className="text-xs opacity-75 flex-shrink-0">
                        Click to join
                    </div>
                )}
            </div>
        </div>
    );
}
