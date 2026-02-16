import React from "react";
import {
    format,
    addHours,
    startOfDay,
    isSameDay,
    differenceInMinutes,
} from "date-fns";
import { useEffect, useState } from "react";
import CalendarItem from "./CalendarItem";

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
}

interface CalendarTimelineProps {
    events: CalendarEvent[];
    selectedDate: Date;
}

export default function CalendarTimeline({
    events,
    selectedDate,
}: CalendarTimelineProps) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const formatHour = (hour: number) => {
        const date = addHours(startOfDay(new Date()), hour);
        return format(date, "h a");
    };

    const getCurrentTimePosition = () => {
        const dayStart = startOfDay(currentTime);
        const minutesFromStart = differenceInMinutes(currentTime, dayStart);
        return (minutesFromStart / 60) * 80;
    };

    
    const allDayEvents = events.filter(
        (e) => e.start.date && !e.start.dateTime,
    );
    const timedEvents = events.filter((e) => e.start.dateTime);

    const currentTimeTop = getCurrentTimePosition();
    const isSelectedDateToday = isSameDay(selectedDate, new Date());

    return (
        <div className="flex flex-col flex-1 overflow-auto">
            {}
            {allDayEvents.length > 0 && (
                <div className="border-b border-gray-700 bg-gray-800/50 p-3">
                    <div className="text-xs text-gray-400 mb-2">All Day</div>
                    <div className="space-y-2">
                        {allDayEvents.map((event) => (
                            <div
                                key={event.id}
                                className="bg-purple-500/20 border-l-4 border-purple-500 rounded p-2 text-sm"
                            >
                                {event.summary}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {}
            <div className="flex flex-1">
                {}
                <div className="w-20 flex-shrink-0 border-r border-gray-700">
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="h-20 border-b border-gray-700 px-2 py-1 text-xs text-gray-400"
                        >
                            {formatHour(hour)}
                        </div>
                    ))}
                </div>

                {}
                <div className="flex-1 relative">
                    {}
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="h-20 border-b border-gray-700"
                            style={{
                                background:
                                    hour % 2 === 0
                                        ? "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)"
                                        : "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)",
                            }}
                        />
                    ))}

                    {}
                    {isSelectedDateToday && (
                        <div
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: `${currentTimeTop}px` }}
                        >
                            <div className="relative">
                                <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full -top-1.5" />
                                <div className="h-0.5 bg-red-500" />
                            </div>
                        </div>
                    )}

                    {/* Timed Events */}
                    <div className="absolute inset-0 px-2">
                        {timedEvents.map((event) => (
                            <CalendarItem key={event.id} event={event} />
                        ))}
                    </div>

                    {/* Empty State */}
                    {timedEvents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            No events scheduled
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
