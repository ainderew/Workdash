import React, { useEffect, useState } from 'react';


import type { BetrayalStats } from '@/communication/chatV2/_types';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';

interface BetrayalStatsBadgeProps {
    userId: number;
}

export function BetrayalStatsBadge({ userId }: BetrayalStatsBadgeProps) {
    const [stats, setStats] = useState<BetrayalStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchStats = async () => {
            try {
                const chatService = ChatV2Service.getInstance();
                const result = await chatService.getBetrayalStats(userId);
                if (!cancelled) setStats(result);
            } catch {
                // No stats available
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        void fetchStats();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    if (isLoading || !stats) return null;

    return (
        <div className="rounded-lg wd-bg-elevated px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
                Betrayal.io
            </p>
            <div className="flex items-center gap-2.5">
                <img
                    src="/assets/betrayal-icon.webp"
                    alt="Betrayal.io"
                    className="h-8 w-8 rounded-sm"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold wd-text-primary truncate">
                        {stats.friendCode}
                    </p>
                    <div className="text-xs wd-text-muted tabular-nums mt-0.5 space-y-px">
                        <p className="flex items-center gap-1">
                            <img src="/assets/betrayal/shield.png" alt="" className="h-2.5 w-2.5 shrink-0" />
                            Crew {stats.crewmateWinrate}% win
                            <span className="wd-text-muted opacity-60">
                                ({stats.crewmateWins}/{stats.crewmateRounds})
                            </span>
                        </p>
                        <p className="flex items-center gap-1">
                            <img src="/assets/betrayal/death.png" alt="" className="h-2.5 w-2.5 shrink-0" />
                            Betrayer {stats.betrayerWinrate}% win
                            <span className="wd-text-muted opacity-60">
                                ({stats.betrayerWins}/{stats.betrayerRounds})
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
