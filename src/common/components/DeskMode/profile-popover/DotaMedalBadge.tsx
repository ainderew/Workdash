import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { DotaRecentMatch, DotaStats } from '@/communication/chatV2/_types';
import { parseMedal } from '@/common/utils/dotaMedal';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';

interface DotaMedalBadgeProps {
    userId: number;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() / 1000 - timestamp;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function MatchRow({ match }: { match: DotaRecentMatch }) {
    return (
        <div className="flex items-center gap-2 py-1.5 text-xs">
            <span
                className="w-1 h-4 rounded-full shrink-0"
                style={{ backgroundColor: match.won ? '#3BA55D' : '#ED4245' }}
            />
            {match.heroIcon && (
                <img
                    src={match.heroIcon}
                    alt={match.heroName}
                    title={match.heroName}
                    className="h-5 w-9 object-cover rounded-sm shrink-0"
                />
            )}
            <span className="wd-text-secondary font-medium tabular-nums">
                {match.kills}/{match.deaths}/{match.assists}
            </span>
            <span className="wd-text-muted tabular-nums">
                {formatDuration(match.duration)}
            </span>
            <span className="ml-auto wd-text-muted text-[11px]">
                {formatTimeAgo(match.startTime)}
            </span>
        </div>
    );
}

export function DotaMedalBadge({ userId }: DotaMedalBadgeProps) {
    const [stats, setStats] = useState<DotaStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [matches, setMatches] = useState<DotaRecentMatch[] | null>(null);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchStats = async () => {
            try {
                const chatService = ChatV2Service.getInstance();
                const result = await chatService.getDotaStats(userId);
                if (!cancelled) setStats(result);
            } catch {
                // No stats available
            } finally {
                if (!cancelled) setIsLoadingStats(false);
            }
        };
        void fetchStats();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    if (isLoadingStats) return null;
    if (!stats) return null;

    const handleToggle = async () => {
        if (expanded) {
            setExpanded(false);
            return;
        }

        setExpanded(true);
        if (matches) return; // already loaded

        setIsLoadingMatches(true);
        try {
            const chatService = ChatV2Service.getInstance();
            const result = await chatService.getDotaMatches(userId);
            setMatches(result);
        } catch {
            setMatches([]);
        } finally {
            setIsLoadingMatches(false);
        }
    };

    if (stats.isPrivate) {
        return (
            <div className="rounded-lg wd-bg-elevated px-3 py-2">
                <p className="text-xs font-medium wd-text-muted">
                    Dota 2 Profile — Private
                </p>
            </div>
        );
    }

    const medal = parseMedal(stats.rankTier);

    return (
        <div className="rounded-lg wd-bg-elevated px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
                Dota 2
            </p>
            <div className="flex items-center gap-2.5">
                {medal ? (
                    <>
                        <img
                            src={medal.imagePath}
                            alt={medal.label}
                            className="h-8 w-8 object-contain"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold wd-text-primary">
                                {medal.label}
                                {medal.stars > 0 && (
                                    <span className="ml-1 font-normal" style={{ color: '#D4AF37' }}>
                                        {'★'.repeat(medal.stars)}
                                    </span>
                                )}
                            </p>
                            {stats.leaderboardRank &&
                                stats.leaderboardRank > 0 && (
                                    <p className="text-xs wd-text-muted">
                                        Leaderboard #{stats.leaderboardRank}
                                    </p>
                                )}
                            {stats.mmrEstimate && (
                                <p className="text-xs wd-text-muted">
                                    ~{stats.mmrEstimate} MMR
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="text-sm wd-text-secondary">Unranked</p>
                        {stats.mmrEstimate && (
                            <p className="text-xs wd-text-muted">
                                ~{stats.mmrEstimate} MMR
                            </p>
                        )}
                    </div>
                )}
            </div>
            {stats.personaName && (
                <p className="text-[11px] wd-text-muted mt-1.5 truncate">
                    {stats.personaName}
                </p>
            )}

            {/* See More — Recent Matches */}
            <button
                type="button"
                onClick={handleToggle}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium wd-text-muted hover:wd-text-secondary transition-colors"
            >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Recent Matches
            </button>

            {expanded && (
                <div className="mt-1 border-t border-white/[0.06] pt-1">
                    {isLoadingMatches ? (
                        <div className="flex justify-center py-2">
                            <Loader2 size={14} className="animate-spin wd-text-muted" />
                        </div>
                    ) : matches && matches.length > 0 ? (
                        <div>
                            {matches.map((match) => (
                                <MatchRow key={match.matchId} match={match} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] wd-text-muted py-2">
                            No recent matches found
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
