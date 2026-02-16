import React from "react";

function GuildRail() {
    return (
        <aside className="w-18 wd-bg-app p-3 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--wd-accent)] text-white font-bold flex items-center justify-center shadow-lg shadow-black/40">
                W
            </div>
            <div className="w-10 h-10 rounded-xl wd-bg-elevated wd-text-secondary text-xs flex items-center justify-center">
                D
            </div>
        </aside>
    );
}

export default GuildRail;
