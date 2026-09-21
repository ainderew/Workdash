import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { BarChart3, ShieldAlert, Users } from "lucide-react";
import { AdminGateMessage } from "./AdminGateMessage";
import { AdminTabBar, type AdminTab } from "./AdminTabBar";
import { useAdminJwt, useAdminResource } from "./useAdminApi";
import { UsersTab } from "./users/UsersTab";
import { AnalyticsTab } from "./analytics/AnalyticsTab";

const TABS: AdminTab[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

/**
 * Admin console shell. The real authorization lives on the server — every
 * /api/admin route re-checks User.role — so this gate only decides what to
 * render, never what is permitted.
 */
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const { jwt, isLoading: isSessionLoading } = useAdminJwt();
  const { error, isLoading } = useAdminResource<{ isAdmin: boolean }>(
    "/session",
    jwt,
  );

  if (isSessionLoading || (jwt && isLoading)) {
    return <AdminGateMessage title="Checking access…" />;
  }

  if (!jwt) {
    return (
      <AdminGateMessage
        icon={ShieldAlert}
        title="Sign in required"
        description="The admin console needs a signed-in WorkDash account."
        action={{ label: "Sign in", onClick: () => void signIn() }}
      />
    );
  }

  if (error) {
    const isForbidden = error.status === 403 || error.status === 401;
    return (
      <AdminGateMessage
        icon={ShieldAlert}
        title={isForbidden ? "Not an admin" : "Could not reach the server"}
        description={
          isForbidden
            ? "This account does not have the ADMIN role. An operator can grant it with `npm run grant-admin -- <email>` on the media server."
            : error.message
        }
      />
    );
  }

  return (
    <div className="min-h-[100dvh] wd-bg-app wd-text-primary">
      <header className="border-b wd-border-subtle wd-bg-panel">
        <div className="mx-auto max-w-[1400px] px-6 py-5">
          <h1 className="text-xl font-bold">Admin console</h1>
          <p className="text-sm wd-text-muted mt-0.5">
            Accounts and platform analytics. Read-only.
          </p>
        </div>
        <AdminTabBar
          tabs={TABS}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {activeTab === "users" ? (
          <UsersTab jwt={jwt} />
        ) : (
          <AnalyticsTab jwt={jwt} />
        )}
      </main>
    </div>
  );
}
