import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import {
  InvitePreviewCard,
  type InviteMetadata,
} from "@/common/components/InvitePreview/InvitePreviewCard";
import { InviteInvalidView } from "@/common/components/InvitePreview/InviteInvalidView";
import { CONFIG } from "@/common/utils/config";

type PageState = "RESOLVING" | "PREVIEW" | "INVALID";

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const { data: session, status: authStatus } = useSession();

  const [pageState, setPageState] = useState<PageState>("RESOLVING");
  const [metadata, setMetadata] = useState<InviteMetadata | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Fetch metadata when code is available
  useEffect(() => {
    if (!code || typeof code !== "string") return;

    const fetchMetadata = async () => {
      try {
        const headers: Record<string, string> = {};
        if (session?.backendJwt) {
          headers["Authorization"] = `Bearer ${session.backendJwt}`;
        }

        const res = await fetch(
          `${CONFIG.SFU_SERVER_URL}/api/invites/${encodeURIComponent(code)}/metadata`,
          { headers },
        );

        if (!res.ok) {
          setPageState("INVALID");
          return;
        }

        const data: InviteMetadata = await res.json();

        if (!data.valid) {
          setMetadata(data);
          setPageState("INVALID");
          return;
        }

        setMetadata(data);

        // If authenticated and already a member, redirect straight to workspace
        if (data.isMember && data.workspaceId) {
          void router.replace(`/app?mode=desk`);
          return;
        }

        setPageState("PREVIEW");
      } catch {
        setPageState("INVALID");
      }
    };

    void fetchMetadata();
  }, [code, session?.backendJwt, router]);

  const handleJoin = useCallback(async () => {
    if (!code || typeof code !== "string") return;
    setIsJoining(true);
    // Redirect to /app with invite code — the existing DeskChatShell logic handles the join
    void router.push(`/app?invite=${encodeURIComponent(code)}&mode=desk`);
  }, [code, router]);

  const handleSignIn = useCallback(() => {
    if (!code || typeof code !== "string") return;
    void router.push(`/login?invite=${encodeURIComponent(code)}`);
  }, [code, router]);

  const isAuthenticated = authStatus === "authenticated";

  return (
    <>
      <Head>
        <title>
          {metadata?.workspace
            ? `Join ${metadata.workspace.name} — WorkDash`
            : "Invite — WorkDash"}
        </title>
      </Head>

      {pageState === "RESOLVING" && <InviteSkeleton />}

      {pageState === "PREVIEW" && metadata && (
        <InvitePreviewCard
          metadata={metadata}
          isAuthenticated={isAuthenticated}
          isJoining={isJoining}
          onJoin={handleJoin}
          onSignIn={handleSignIn}
        />
      )}

      {pageState === "INVALID" && (
        <InviteInvalidView
          reason={metadata?.reason}
          workspace={metadata?.workspace ?? null}
        />
      )}
    </>
  );
}

function InviteSkeleton() {
  return (
    <div className="wd-invite-card-wrapper">
      <div className="wd-invite-card">
        {/* Icon skeleton */}
        <div className="w-20 h-20 rounded-[14px] wd-invite-skeleton animate-pulse" />
        {/* Name skeleton */}
        <div className="w-40 h-6 mt-4 rounded-lg wd-invite-skeleton animate-pulse" />
        {/* Member count skeleton */}
        <div className="w-24 h-4 mt-2 rounded-md wd-invite-skeleton animate-pulse" />
        {/* Inviter skeleton */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-5 h-5 rounded-full wd-invite-skeleton animate-pulse" />
          <div className="w-28 h-4 rounded-md wd-invite-skeleton animate-pulse" />
        </div>
        {/* Button skeleton */}
        <div className="w-full h-11 mt-6 rounded-md wd-invite-skeleton animate-pulse" />
      </div>
    </div>
  );
}
