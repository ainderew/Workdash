import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import type { BetrayalStats, DotaStats } from '@/communication/chatV2/_types';
import { parseMedal } from '@/common/utils/dotaMedal';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';

function ConnectionsPanel() {
    const [stats, setStats] = useState<DotaStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const popupRef = useRef<Window | null>(null);

    // Betrayal.io state
    const [betrayalStats, setBetrayalStats] = useState<BetrayalStats | null>(
        null,
    );
    const [isBetrayalLoading, setIsBetrayalLoading] = useState(true);
    const [isBetrayalLinking, setIsBetrayalLinking] = useState(false);
    const [isBetrayalSyncing, setIsBetrayalSyncing] = useState(false);
    const [betrayalFriendCode, setBetrayalFriendCode] = useState('');

    const chatService = ChatV2Service.getInstance();

    const fetchStats = useCallback(async () => {
        try {
            setIsLoading(true);
            const user = tokenStore.getUser();
            if (!user?.id) return;
            const result = await chatService.getDotaStats(user.id);
            setStats(result);
        } catch {
            // No stats — that's fine
        } finally {
            setIsLoading(false);
        }
    }, [chatService]);

    const fetchBetrayalStats = useCallback(async () => {
        try {
            setIsBetrayalLoading(true);
            const user = tokenStore.getUser();
            if (!user?.id) return;
            const result = await chatService.getBetrayalStats(user.id);
            setBetrayalStats(result);
        } catch {
            // No stats
        } finally {
            setIsBetrayalLoading(false);
        }
    }, [chatService]);

    useEffect(() => {
        void fetchStats();
        void fetchBetrayalStats();
    }, [fetchStats, fetchBetrayalStats]);

    // Listen for postMessage from the Steam auth popup
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== CONFIG.SFU_SERVER_URL) return;
            if (event.data?.type !== 'steam-link-result') return;

            setIsLinking(false);
            popupRef.current = null;

            if (event.data.success) {
                toast.success('Steam account linked');
                void fetchStats();
            } else {
                toast.error(event.data.message || 'Failed to link Steam');
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [fetchStats]);

    const handleSteamSignIn = async () => {
        const jwt = tokenStore.getJwt();
        if (!jwt) {
            toast.error('Not authenticated');
            return;
        }

        setIsLinking(true);
        try {
            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/steam/initiate`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${jwt}` },
                },
            );
            if (!response.ok) {
                throw new Error('Failed to initiate Steam auth');
            }
            const { authUrl } = await response.json();

            const w = 800;
            const h = 600;
            const left = window.screenX + (window.outerWidth - w) / 2;
            const top = window.screenY + (window.outerHeight - h) / 2;
            const popup = window.open(
                authUrl,
                'steam-auth',
                `width=${w},height=${h},left=${left},top=${top},popup=yes`,
            );
            popupRef.current = popup;

            const interval = window.setInterval(() => {
                if (popup && popup.closed) {
                    window.clearInterval(interval);
                    setIsLinking(false);
                    popupRef.current = null;
                }
            }, 500);
        } catch (err) {
            setIsLinking(false);
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Failed to start Steam auth',
            );
        }
    };

    const handleUnlink = async () => {
        try {
            await chatService.unlinkSteam();
            setStats(null);
            toast.success('Steam account unlinked');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to unlink',
            );
        }
    };

    const handleRefresh = async () => {
        if (!stats) return;
        setIsSyncing(true);
        try {
            const result = await chatService.syncDotaStats();
            setStats(result);
            toast.success('Stats refreshed');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to refresh',
            );
        } finally {
            setIsSyncing(false);
        }
    };

    const handleBetrayalLink = async () => {
        if (!betrayalFriendCode.trim()) {
            toast.error('Please enter your friend code');
            return;
        }
        setIsBetrayalLinking(true);
        try {
            const result = await chatService.linkBetrayal(
                betrayalFriendCode.trim(),
            );
            setBetrayalStats(result);
            setBetrayalFriendCode('');
            toast.success('Betrayal.io account linked');
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Failed to link Betrayal.io',
            );
        } finally {
            setIsBetrayalLinking(false);
        }
    };

    const handleBetrayalUnlink = async () => {
        try {
            await chatService.unlinkBetrayal();
            setBetrayalStats(null);
            toast.success('Betrayal.io account unlinked');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to unlink',
            );
        }
    };

    const handleBetrayalRefresh = async () => {
        if (!betrayalStats) return;
        setIsBetrayalSyncing(true);
        try {
            const result = await chatService.syncBetrayalStats();
            setBetrayalStats(result);
            toast.success('Stats refreshed');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to refresh',
            );
        } finally {
            setIsBetrayalSyncing(false);
        }
    };

    const medal = stats ? parseMedal(stats.rankTier) : null;

    if (isLoading && isBetrayalLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin wd-text-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="mb-1">
                <h2 className="text-[15px] font-semibold wd-text-primary">
                    Connections
                </h2>
                <p className="text-[12px] wd-text-muted mt-0.5">
                    Link external accounts to display on your profile.
                </p>
            </div>

            {/* Steam / Dota 2 Section */}
            <div
                className="rounded-xl border wd-border-subtle p-4 transition-colors duration-150 hover:border-[var(--wd-border-strong)]"
                style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold wd-text-primary">
                        Dota 2 (Steam)
                    </h3>
                    {stats && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isSyncing}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium wd-text-muted hover:wd-text-primary transition-colors disabled:opacity-50"
                                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                            >
                                <RefreshCw
                                    size={11}
                                    className={isSyncing ? 'animate-spin' : ''}
                                />
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={handleUnlink}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium wd-text-danger hover:opacity-80 transition-colors"
                            >
                                <Unlink size={11} />
                                Unlink
                            </button>
                        </div>
                    )}
                </div>

                {stats ? (
                    <div className="space-y-2">
                        {stats.personaName && (
                            <div className="flex items-center gap-2">
                                {stats.avatarUrl && (
                                    <Image
                                        src={stats.avatarUrl}
                                        alt=""
                                        width={24}
                                        height={24}
                                        className="rounded-sm"
                                    />
                                )}
                                <p className="text-[12px] wd-text-secondary">
                                    Linked as{' '}
                                    <span className="font-semibold wd-text-primary">
                                        {stats.personaName}
                                    </span>
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {medal ? (
                                <>
                                    <img
                                        src={medal.imagePath}
                                        alt={medal.label}
                                        className="h-6 w-6 object-contain"
                                    />
                                    <span className="text-[13px] wd-text-primary font-medium">
                                        {medal.label}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[12px] wd-text-secondary">
                                    {stats.isPrivate
                                        ? 'Private Profile'
                                        : 'Unranked'}
                                </span>
                            )}
                            {stats.mmrEstimate && (
                                <span className="text-[11px] wd-text-muted">
                                    ~{stats.mmrEstimate} MMR
                                </span>
                            )}
                        </div>
                        {stats.lastSyncedAt && (
                            <p className="text-[10px] wd-text-muted">
                                Last synced:{' '}
                                {new Date(
                                    stats.lastSyncedAt,
                                ).toLocaleString()}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-[12px] wd-text-muted">
                            Link your Steam account to display your Dota 2 rank
                            on your profile.
                        </p>
                        <button
                            type="button"
                            onClick={handleSteamSignIn}
                            disabled={isLinking}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-semibold text-white bg-[#171a21] hover:bg-[#2a475e] transition-colors disabled:opacity-50"
                        >
                            {isLinking ? (
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                            ) : (
                                <svg
                                    viewBox="0 0 256 259"
                                    width="14"
                                    height="14"
                                    fill="currentColor"
                                >
                                    <path d="M127.779 0C57.865 0 .584 55.32 0 124.903l68.722 28.399a36.14 36.14 0 0 1 20.454-6.305h1.911l30.603-44.305v-.621c0-26.856 21.861-48.715 48.717-48.715 26.855 0 48.716 21.862 48.716 48.726 0 26.856-21.864 48.716-48.72 48.716h-1.132l-43.593 31.109v1.705c0 20.143-16.371 36.523-36.519 36.523a36.64 36.64 0 0 1-35.843-29.213L2.075 168.451C14.758 219.254 65.862 258.278 127.779 258.278 198.402 258.278 256 200.678 256 129.136 256 57.606 198.402 0 127.779 0" />
                                </svg>
                            )}
                            Sign in with Steam
                        </button>
                    </div>
                )}
            </div>

            {/* Betrayal.io Section */}
            <div
                className="rounded-xl border wd-border-subtle p-4 transition-colors duration-150 hover:border-[var(--wd-border-strong)]"
                style={{ backgroundColor: 'var(--wd-surface-panel-2)' }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold wd-text-primary flex items-center gap-1.5">
                        <img
                            src="/assets/betrayal-icon.webp"
                            alt="Betrayal.io"
                            className="h-4 w-4 rounded-sm"
                        />
                        Betrayal.io
                    </h3>
                    {betrayalStats && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleBetrayalRefresh}
                                disabled={isBetrayalSyncing}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium wd-text-muted hover:wd-text-primary transition-colors disabled:opacity-50"
                                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                            >
                                <RefreshCw
                                    size={11}
                                    className={
                                        isBetrayalSyncing
                                            ? 'animate-spin'
                                            : ''
                                    }
                                />
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={handleBetrayalUnlink}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium wd-text-danger hover:opacity-80 transition-colors"
                            >
                                <Unlink size={11} />
                                Unlink
                            </button>
                        </div>
                    )}
                </div>

                {isBetrayalLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2
                            size={16}
                            className="animate-spin wd-text-muted"
                        />
                    </div>
                ) : betrayalStats ? (
                    <div className="space-y-2">
                        <p className="text-[12px] wd-text-secondary">
                            Linked as{' '}
                            <span className="font-semibold wd-text-primary">
                                {betrayalStats.friendCode}
                            </span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                className="rounded-lg p-2.5"
                                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                            >
                                <p className="text-[10px] wd-text-muted mb-0.5 flex items-center gap-1">
                                    <img src="/assets/betrayal/shield.png" alt="" className="h-3 w-3" />
                                    Crewmate
                                </p>
                                <p className="text-[13px] font-semibold wd-text-primary tabular-nums">
                                    {betrayalStats.crewmateWinrate}% WR
                                </p>
                                <p className="text-[10px] wd-text-muted tabular-nums">
                                    {betrayalStats.crewmateWins}W /{' '}
                                    {betrayalStats.crewmateRounds -
                                        betrayalStats.crewmateWins}
                                    L &middot;{' '}
                                    {betrayalStats.crewmateRounds} rounds
                                </p>
                            </div>
                            <div
                                className="rounded-lg p-2.5"
                                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                            >
                                <p className="text-[10px] wd-text-muted mb-0.5 flex items-center gap-1">
                                    <img src="/assets/betrayal/death.png" alt="" className="h-3 w-3" />
                                    Betrayer
                                </p>
                                <p className="text-[13px] font-semibold wd-text-primary tabular-nums">
                                    {betrayalStats.betrayerWinrate}% WR
                                </p>
                                <p className="text-[10px] wd-text-muted tabular-nums">
                                    {betrayalStats.betrayerWins}W /{' '}
                                    {betrayalStats.betrayerRounds -
                                        betrayalStats.betrayerWins}
                                    L &middot;{' '}
                                    {betrayalStats.betrayerRounds} rounds
                                </p>
                            </div>
                        </div>
                        {betrayalStats.lastSyncedAt && (
                            <p className="text-[10px] wd-text-muted">
                                Last synced:{' '}
                                {new Date(
                                    betrayalStats.lastSyncedAt,
                                ).toLocaleString()}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-[12px] wd-text-muted">
                            Link your Betrayal.io account to display your stats
                            on your profile.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={betrayalFriendCode}
                                onChange={(e) =>
                                    setBetrayalFriendCode(e.target.value)
                                }
                                placeholder="name#1234"
                                className="wd-settings-input flex-1 h-9 px-3 rounded-lg text-[12px] wd-text-primary border wd-border-subtle placeholder:wd-text-muted outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)]"
                                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                        void handleBetrayalLink();
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleBetrayalLink}
                                disabled={isBetrayalLinking}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-semibold text-white bg-[#E74C3C] hover:bg-[#C0392B] transition-colors disabled:opacity-50"
                            >
                                {isBetrayalLinking && (
                                    <Loader2
                                        size={14}
                                        className="animate-spin"
                                    />
                                )}
                                Link
                            </button>
                        </div>
                        <p className="text-[10px] wd-text-muted">
                            Enter your friend code (e.g. ddrw#9247)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ConnectionsPanel;
