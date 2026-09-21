import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminDashboard } from "./AdminDashboard";

const useSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
  signIn: vi.fn(),
}));

vi.mock("@nivo/line", () => ({
  ResponsiveLine: () => <div data-testid="nivo-line" />,
}));

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("AdminDashboard access gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the visitor to sign in when there is no session token", async () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    vi.stubGlobal("fetch", mockFetch(200, { isAdmin: true }));

    render(<AdminDashboard />);

    expect(
      await screen.findByRole("heading", { name: "Sign in required" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("does not call the admin API without a token", async () => {
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const fetchMock = mockFetch(200, { isAdmin: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard />);

    await screen.findByRole("heading", { name: "Sign in required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a denial, not the dashboard, when the server returns 403", async () => {
    useSession.mockReturnValue({
      data: { backendJwt: "jwt-123" },
      status: "authenticated",
    });
    vi.stubGlobal(
      "fetch",
      mockFetch(403, { error: "Admin access required" }),
    );

    render(<AdminDashboard />);

    expect(
      await screen.findByRole("heading", { name: "Not an admin" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("distinguishes a server outage from a permission denial", async () => {
    useSession.mockReturnValue({
      data: { backendJwt: "jwt-123" },
      status: "authenticated",
    });
    vi.stubGlobal("fetch", mockFetch(500, { error: "boom" }));

    render(<AdminDashboard />);

    expect(
      await screen.findByRole("heading", { name: "Could not reach the server" }),
    ).toBeInTheDocument();
  });

  it("renders the Users and Analytics tabs for an admin", async () => {
    useSession.mockReturnValue({
      data: { backendJwt: "jwt-123" },
      status: "authenticated",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const body = url.includes("/session")
          ? { isAdmin: true }
          : {
              users: [],
              pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
            };
        return Promise.resolve({ ok: true, status: 200, json: async () => body });
      }),
    );

    render(<AdminDashboard />);

    await waitFor(() =>
      expect(screen.getByRole("tablist")).toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Analytics" })).toBeInTheDocument();
  });

  it("sends the session token as a bearer credential", async () => {
    useSession.mockReturnValue({
      data: { backendJwt: "jwt-123" },
      status: "authenticated",
    });
    const fetchMock = mockFetch(200, { isAdmin: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // The session probe and the first users request race; assert on the probe
    // wherever it landed rather than on call order.
    const sessionCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/admin/session"),
    );

    expect(sessionCall).toBeDefined();
    expect(sessionCall![1]).toMatchObject({
      headers: { Authorization: "Bearer jwt-123" },
    });
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toMatchObject({
        headers: { Authorization: "Bearer jwt-123" },
      });
    }
  });
});
