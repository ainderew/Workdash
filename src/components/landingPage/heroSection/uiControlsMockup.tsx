import React from "react";
import {
    MessageCircle,
    VideoOff,
    MicOff,
    MonitorUp,
    Calendar,
    Smile,
    Users,
} from "lucide-react";

function UiControlsMockup() {
    return (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 h-18 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl flex justify-center items-center gap-3 px-4">
            {/* Character/Profile Button */}
            <div className="flex items-center gap-3 bg-slate-800/80 rounded-xl px-3 py-1 border border-slate-600/50">
                <div className="w-5 h-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-green-400 flex items-center justify-center overflow-hidden">
                    {/* Pixel avatar placeholder */}
                    <div className="w-3 h-3 bg-green-500 rounded-xs relative">
                        <div className="absolute top-1 left-1 right-1 h-3 bg-amber-200 rounded-t-sm" />
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-cyan-400 rounded-b-sm" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-white text-[10px] font-medium">
                        Andrew
                    </span>
                    <span className="text-green-400 text-[10px]">
                        Available
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-700/50" />

            {/* Video Button - Off State (Red) */}
            <button className="w-8 h-8 rounded-lg bg-red-900/40 border border-red-500/30 hover:border-red-400 transition-all flex items-center justify-center">
                <VideoOff className="w-5 h-5 text-red-400" />
            </button>

            {/* Mic Button - Muted State (Red) */}
            <button className="w-8 h-8 rounded-lg bg-red-900/40 border border-red-500/30 hover:border-red-400 transition-all flex items-center justify-center">
                <MicOff className="w-5 h-5 text-red-400" />
            </button>

            {/* Screen Share Button */}
            <button className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-600/50 hover:border-cyan-400/50 hover:bg-cyan-900/20 transition-all flex items-center justify-center group">
                <MonitorUp className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Reactions Button */}
            <button className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-600/50 hover:border-cyan-400/50 hover:bg-cyan-900/20 transition-all flex items-center justify-center group">
                <Smile className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-700/50" />

            {/* Calendar Button */}
            <button className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-600/50 hover:border-cyan-400/50 hover:bg-cyan-900/20 transition-all flex items-center justify-center group">
                <Calendar className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Chat Button */}
            <button className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-600/50 hover:border-cyan-400/50 hover:bg-cyan-900/20 transition-all flex items-center justify-center group">
                <MessageCircle className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Online Members Button */}
            <button className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-600/50 hover:border-cyan-400/50 hover:bg-cyan-900/20 transition-all group">
                <Users className="w-3 h-3 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                <span className="text-slate-300 text-xs group-hover:text-cyan-400 transition-colors">
                    2 Online
                </span>
                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            </button>
        </div>
    );
}

export default UiControlsMockup;
