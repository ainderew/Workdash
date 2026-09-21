export type AdminUserRole = "ADMIN" | "MEMBER" | "GUEST";
export type AdminUserStatus = "ONLINE" | "OFFLINE" | "FOCUS";
export type AdminUserSort = "createdAt" | "lastLoginAt" | "name" | "email";

export interface AdminUserSummary {
  id: number;
  email: string;
  name: string | null;
  nickname: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  level: number;
  emailVerified: boolean;
  authMethods: string[];
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  presence: {
    isOnline: boolean;
    statusId: string;
    lastSeenAt: string | null;
  } | null;
  workspaceCount: number;
  ownedWorkspaceCount: number;
  messageCount: number;
}

export interface AdminUserListResponse {
  users: AdminUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserFilters {
  search: string;
  role: AdminUserRole | "";
  status: AdminUserStatus | "";
  page: number;
  sort: AdminUserSort;
  direction: "asc" | "desc";
}

export interface AdminUserDetail {
  user: AdminUserSummary & {
    bio: string | null;
    updatedAt: string;
    customStatus: { emoji: string | null; text: string | null } | null;
    settings: {
      theme: string | null;
      volume: number;
      playBackgroundMusic: boolean;
    } | null;
    counts: {
      workspaces: number;
      workspacesOwned: number;
      messages: number;
      reactions: number;
      pushSubscriptions: number;
      achievements: number;
    };
  };
  integrations: {
    steam: {
      steamId64: string;
      personaName: string | null;
      rankTier: number | null;
      lifetimeGames: number | null;
      lifetimeWinRate: number | null;
      linkedAt: string;
      lastSyncedAt: string | null;
    } | null;
    betrayal: {
      friendCode: string;
      linkedAt: string;
      lastSyncedAt: string | null;
    } | null;
  };
  workspaces: Array<{
    id: string;
    name: string;
    iconUrl: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    memberCount: number;
    isOwner: boolean;
    nickname: string | null;
    joinedAt: string;
    timedOutUntil: string | null;
    roles: Array<{ id: string; name: string; color: number }>;
  }>;
  recentMessages: Array<{
    id: string;
    createdAt: string;
    messageType: string;
    roomId: string;
    roomName: string;
    roomType: string;
    workspaceName: string | null;
  }>;
}

export interface DailyBucket {
  day: string;
  count: number;
}

export interface AdminAnalytics {
  range: { days: number; since: string; until: string };
  growth: {
    totalUsers: number;
    newUsers: number;
    onlineNow: number;
    activeUsers: { dau: number; wau: number; mau: number };
    signupsByDay: DailyBucket[];
  };
  engagement: {
    totalMessages: number;
    activeChannels: number;
    messagesPerDay: number;
    messagesByDay: DailyBucket[];
    topPosters: Array<{
      userId: number;
      messageCount: number;
      user: {
        id: number;
        name: string | null;
        nickname: string | null;
        email: string;
        avatarUrl: string | null;
      } | null;
    }>;
    attachments: { count: number; totalBytes: number };
  };
  workspaces: {
    total: number;
    created: number;
    createdByDay: DailyBucket[];
    visibilitySplit: Array<{ visibility: string; count: number }>;
    topWorkspaces: Array<{
      id: string;
      name: string;
      iconUrl: string | null;
      visibility: string;
      createdAt: string;
      memberCount: number;
      roomCount: number;
      owner: { id: number; name: string | null; email: string };
    }>;
    invites: { created: number; uses: number };
    joinRequests: Array<{ status: string; count: number }>;
  };
  auth: {
    magicLink: number;
    unrecorded: number;
    verified: number;
    total: number;
    verifiedRate: number;
    integrations: {
      steamLinks: number;
      betrayalLinks: number;
      pushSubscriptions: number;
      pushSubscribers: number;
    };
  };
}
