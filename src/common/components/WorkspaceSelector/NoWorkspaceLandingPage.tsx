import React, { useCallback, useEffect, useRef, useState } from "react";
import { Compass, Link, Plus, Search } from "lucide-react";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import type { PublicWorkspacePreview } from "@/communication/chatV2/_types";
import useWorkspaceStore from "@/common/store/workspaceStore";
import PublicWorkspacePreviewCard from "./PublicWorkspacePreviewCard";

type Props = {
    onCreateClick: () => void;
    onJoinClick: () => void;
    onJoinedWorkspace: () => void;
};

function NoWorkspaceLandingPage({
    onCreateClick,
    onJoinClick,
    onJoinedWorkspace,
}: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PublicWorkspacePreview[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const fetchMyWorkspaces = useWorkspaceStore((s) => s.fetchMyWorkspaces);

    // Debounced search
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const service = ChatV2Service.getInstance();
                const workspaces = await service.searchPublicWorkspaces(trimmed);
                setResults(workspaces);
                setHasSearched(true);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    // Listen for join request resolution
    useEffect(() => {
        const transport = MediaTransportService.getInstance();
        const socket = transport.socket;
        if (!socket) return;

        const handler = (payload: {
            workspaceId: string;
            workspaceName: string;
            status: string;
        }) => {
            if (payload.status === "APPROVED") {
                void fetchMyWorkspaces().then(() => {
                    onJoinedWorkspace();
                });
            } else if (payload.status === "DENIED") {
                setResults((prev) =>
                    prev.map((ws) =>
                        ws.id === payload.workspaceId
                            ? { ...ws, joinRequestStatus: "DENIED" as const }
                            : ws,
                    ),
                );
            }
        };

        socket.on("workspace:join-request:resolved", handler);
        return () => {
            socket.off("workspace:join-request:resolved", handler);
        };
    }, [fetchMyWorkspaces, onJoinedWorkspace]);

    const handleRequestJoin = useCallback(async (workspaceId: string) => {
        const service = ChatV2Service.getInstance();
        await service.requestToJoinWorkspace(workspaceId);
    }, []);

    const showEmptySearch = !isSearching && hasSearched && results.length === 0;
    const showResults = results.length > 0;

    return (
        <div className="flex flex-col gap-5">
            {/* Search input */}
            <div className="relative">
                <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
                />
                <input
                    type="text"
                    className="wd-input pl-10 !rounded-xl"
                    placeholder="Search public workspaces..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {isSearching && (
                    <div
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "var(--wd-accent)", borderTopColor: "transparent" }}
                    />
                )}
            </div>

            {/* Search results */}
            {showResults && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 max-h-[38vh] overflow-y-auto no-scrollbar px-1 py-1">
                    {results.map((ws, i) => (
                        <PublicWorkspacePreviewCard
                            key={ws.id}
                            workspace={ws}
                            index={i}
                            onRequestJoin={handleRequestJoin}
                        />
                    ))}
                </div>
            )}

            {/* Empty search state */}
            {showEmptySearch && (
                <div className="text-center py-10 space-y-2">
                    <Compass
                        size={28}
                        className="mx-auto wd-text-muted opacity-40"
                    />
                    <p className="text-sm wd-text-muted">
                        No public workspaces found matching &ldquo;{query.trim()}&rdquo;
                    </p>
                </div>
            )}

            {/* Idle state — no search yet */}
            {!hasSearched && !isSearching && (
                <div className="text-center py-8 space-y-1.5">
                    <Compass
                        size={24}
                        className="mx-auto wd-text-muted opacity-30"
                    />
                    <p className="text-[13px] wd-text-muted">
                        Start typing to discover public workspaces
                    </p>
                </div>
            )}

            {/* Divider */}
            <div className="wd-ws-shimmer h-px w-full rounded-full" />

            {/* CTAs */}
            <div className="flex items-center justify-center gap-3">
                <button
                    type="button"
                    className="wd-btn-primary inline-flex items-center gap-1.5 text-[13px]"
                    onClick={onCreateClick}
                >
                    <Plus size={14} />
                    Create Workspace
                </button>
                <span className="wd-text-muted text-[11px] select-none">or</span>
                <button
                    type="button"
                    className="wd-btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                    onClick={onJoinClick}
                >
                    <Link size={14} />
                    Join by Invite
                </button>
            </div>
        </div>
    );
}

export default NoWorkspaceLandingPage;
