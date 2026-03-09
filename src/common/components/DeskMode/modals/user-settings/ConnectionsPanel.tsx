import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import type { DotaStats } from '@/communication/chatV2/_types';
import { parseMedal } from '@/common/utils/dotaMedal';
import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';

function ConnectionsPanel() {
    const [stats, setStats] = useState<DotaStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const popupRef = useRef<Window | null>(null);

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

    useEffect(() => {
        void fetchStats();
    }, [fetchStats]);

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
            toast.error(err instanceof Error ? err.message : 'Failed to start Steam auth');
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

    const medal = stats ? parseMedal(stats.rankTier) : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin wd-text-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold wd-text-primary">
                    Connections
                </h2>
                <p className="text-sm wd-text-muted mt-1">
                    Link external accounts to display on your profile.
                </p>
            </div>

            {/* Steam / Dota 2 Section */}
            <div className="rounded-lg border wd-border-subtle wd-bg-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold wd-text-primary">
                        Dota 2 (Steam)
                    </h3>
                    {stats && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isSyncing}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium wd-text-secondary hover:wd-text-primary hover:wd-bg-elevated transition-colors disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={12}
                                    className={
                                        isSyncing ? 'animate-spin' : ''
                                    }
                                />
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={handleUnlink}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium wd-text-danger hover:opacity-80 transition-colors"
                            >
                                <Unlink size={12} />
                                Unlink
                            </button>
                        </div>
                    )}
                </div>

                {stats ? (
                    <div className="space-y-2">
                        {stats.personaName && (
                            <p className="text-sm wd-text-secondary">
                                Linked as{' '}
                                <span className="font-medium wd-text-primary">
                                    {stats.personaName}
                                </span>
                            </p>
                        )}
                        <div className="flex items-center gap-2">
                            {medal ? (
                                <>
                                    <img
                                        src={medal.imagePath}
                                        alt={medal.label}
                                        className="h-6 w-6 object-contain"
                                    />
                                    <span className="text-sm wd-text-primary font-medium">
                                        {medal.label}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm wd-text-secondary">
                                    {stats.isPrivate
                                        ? 'Private Profile'
                                        : 'Unranked'}
                                </span>
                            )}
                            {stats.mmrEstimate && (
                                <span className="text-xs wd-text-muted">
                                    ~{stats.mmrEstimate} MMR
                                </span>
                            )}
                        </div>
                        {stats.lastSyncedAt && (
                            <p className="text-[11px] wd-text-muted">
                                Last synced:{' '}
                                {new Date(
                                    stats.lastSyncedAt,
                                ).toLocaleString()}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm wd-text-muted">
                            Link your Steam account to display your Dota 2 rank
                            on your profile.
                        </p>
                        <button
                            type="button"
                            onClick={handleSteamSignIn}
                            disabled={isLinking}
                            className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-medium text-white bg-[#171a21] hover:bg-[#2a475e] transition-colors disabled:opacity-50"
                        >
                            {isLinking ? (
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                            ) : (
                                <svg
                                    viewBox="0 0 256 259"
                                    width="16"
                                    height="16"
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
        </div>
    );
}

export default ConnectionsPanel;
