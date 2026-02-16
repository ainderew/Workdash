import React, { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { RefreshCw, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import SidebarHeader from "../SidebarMenu/SidebarHeader";
import SidebarMenu from "../SidebarMenu/SidebarMenu";
import GoogleCalendarButton from "./GoogleCalendarButton";
import CalendarTimeline from "./CalendarTimeline";
import useCalendar from "./useCalendar";

interface CalendarMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

function CalendarMenu({ isOpen, onClose }: CalendarMenuProps) {
    const { data: session } = useSession();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { calendarEvents, loading, fetchEvents } = useCalendar(selectedDate);

    const handlePreviousDay = () => {
        setSelectedDate((prev) => subDays(prev, 1));
    };

    const handleNextDay = () => {
        setSelectedDate((prev) => addDays(prev, 1));
    };

    const handleToday = () => {
        setSelectedDate(new Date());
    };

    const isToday =
        format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    return (
        <SidebarMenu isOpen={isOpen}>
            <SidebarHeader onClose={onClose} title="Calendar" />

            {!session ? (
                
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="mb-6">
                        <svg
                            className="w-24 h-24 mx-auto mb-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Connect Your Calendar
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Sign in with Google to view your calendar events
                        </p>
                    </div>
                    <GoogleCalendarButton />
                </div>
            ) : (
                
                <div className="flex flex-col h-full pb-20">
                    {}
                    <div className="p-4 border-b border-gray-700 space-y-3">
                        {}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">
                                {format(selectedDate, "EEEE, MMMM d")}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={fetchEvents}
                                    disabled={loading}
                                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-2 rounded hover:bg-gray-800"
                                    title="Refresh calendar"
                                >
                                    <RefreshCw
                                        size={18}
                                        className={
                                            loading ? "animate-spin" : ""
                                        }
                                    />
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded hover:bg-gray-800"
                                    title="Sign out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>

                        {}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousDay}
                                className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                title="Previous day"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <button
                                onClick={handleToday}
                                disabled={isToday}
                                className="flex-1 px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Today
                            </button>

                            <button
                                onClick={handleNextDay}
                                className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                title="Next day"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {}
                    {session.user && (
                        <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-3 bg-gray-800/50">
                            {session.user.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    className="w-8 h-8 rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {session.user.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {session.user.email}
                                </p>
                            </div>
                        </div>
                    )}

                    {}
                    {loading && calendarEvents.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                                <p className="text-gray-400">
                                    Loading calendar...
                                </p>
                            </div>
                        </div>
                    ) : (
                        
                        <CalendarTimeline
                            events={calendarEvents}
                            selectedDate={selectedDate}
                        />
                    )}
                </div>
            )}
        </SidebarMenu>
    );
}

export default CalendarMenu;
