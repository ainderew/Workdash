import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { CONFIG } from "@/common/utils/config";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * Bearer token for the SFU. Admin pages render outside App.tsx, so tokenStore
 * is never populated here — the NextAuth session is the only source.
 */
export function useAdminJwt(): { jwt: string | null; isLoading: boolean } {
  const { data: session, status } = useSession();
  return {
    jwt: session?.backendJwt ?? null,
    isLoading: status === "loading",
  };
}

async function requestAdmin<T>(
  path: string,
  jwt: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(`${CONFIG.SFU_SERVER_URL}/api/admin${path}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AdminApiError(
      body?.error ?? `Request failed (HTTP ${response.status})`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

interface AdminResource<T> {
  data: T | null;
  error: AdminApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Fetches an admin endpoint and re-fetches whenever `path` changes. In-flight
 * requests are aborted on change so a slow page-1 response cannot overwrite a
 * fast page-2 one.
 */
export function useAdminResource<T>(
  path: string | null,
  jwt: string | null,
): AdminResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const latestPath = useRef<string | null>(path);

  useEffect(() => {
    if (!path || !jwt) return;

    const controller = new AbortController();
    latestPath.current = path;
    setIsLoading(true);
    setError(null);

    requestAdmin<T>(path, jwt, controller.signal)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof AdminApiError
            ? err
            : new AdminApiError("Network error", 0),
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [path, jwt, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, error, isLoading, refetch };
}
