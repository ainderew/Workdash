import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function GameUI() {
    const { data: session } = useSession();

    const handleViewCalendar = async () => {
        if (!session) {
            await signIn("google");
            return;
        }

        
        const res = await fetch("/api/calendar");
        const events = await res.json();
        console.log(events);
        
    };

    return (
        <div className="game-overlay">
            <button className="bg-white w-30 h-10" onClick={() => signOut()}>
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
