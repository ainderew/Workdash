import React from "react";
import { signIn, useSession } from "next-auth/react";
import { signOutWithCleanup } from "@/common/utils/signOutWithCleanup";
import { logger } from "@/common/utils/logger";

export default function GameUI() {
    const { data: session } = useSession();

    const handleViewCalendar = async () => {
        if (!session) {
            await signIn("google");
            return;
        }

        
        const res = await fetch("/api/calendar");
        const events = await res.json();
        logger.log(events);
        
    };

    return (
        <div className="game-overlay">
            <button className="bg-white w-30 h-10" onClick={() => signOutWithCleanup()}>
                Sign Out
            </button>
            {session ? (
                <button
                    className="bg-white w-30 h-10"
                    onClick={handleViewCalendar}
                >
                    View Calendar
                </button>
            ) : (
                <button
                    className="bg-white w-30 h-10"
                    onClick={() => signIn("google")}
                >
                    Login with Google
                </button>
            )}
        </div>
    );
}
