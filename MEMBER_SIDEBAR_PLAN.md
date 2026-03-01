# Member Sidebar Redesign - Implementation Plan

## Goal
Redesign the MemberPanel (right sidebar) to match a Discord-style member list with:
- Members grouped by role with section headers showing role name + count
- Avatar + name layout per member (horizontal row)
- Search/filter bar at top
- Online status indicator dots on avatars
- Offline members dimmed
- Clean dark theme matching existing `wd-*` design tokens

## Current State
- **File:** `src/common/components/DeskMode/MemberPanel.tsx`
- Members displayed as flat list with card-style items (bg-elevated boxes)
- Each item shows name + role text + remove button
- No avatars, no grouping, no search, no status indicators
- Uses `ChatV2RoomMember` type with roles: OWNER, ADMIN, MODERATOR, MEMBER, READ_ONLY
- `UserAvatar` component exists at `src/common/components/DeskMode/UserAvatar.tsx`
- `getDisplayName` utility at `src/common/utils/displayName.ts`

## Data Model (ChatV2RoomMember)
```ts
{
  roomId: string;
  userId: number;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY";
  status: "ACTIVE" | "INVITED" | "REMOVED";
  joinedAt: string | Date;
  user: {
    id: number;
    name: string;
    nickname?: string | null;
    email: string;
    image?: string | null;
    characterCustomization?: ChatV2CharacterCustomization | null;
  };
}
```

## Design Reference (from mockup)
- Dark background panel on the right
- Section headers: `ROLE_NAME — count` in uppercase muted text
- Each member: circular avatar (with optional status dot) + display name
- Online members have green status dot, offline members are dimmed/grayed
- Search bar at the very top with icon

---

## Phase 1: Core Redesign — Role Grouping + Avatar Layout
**Scope:** Rewrite `MemberPanel.tsx` to group members by role and use avatar+name layout

### Changes:
1. **MemberPanel.tsx** — Full rewrite:
   - Group members by role using a defined order: OWNER → ADMIN → MODERATOR → MEMBER → READ_ONLY
   - Render section headers: `Role Name — {count}` (uppercase, muted, small text)
   - Each member row: `UserAvatar` (size "sm") + display name side by side
   - Right-click or hover for remove action (move remove button to context/hover)
   - Keep `+ Add` button in header
   - Keep `AddMemberModal` integration unchanged
   - Width stays `w-56`, responsive `hidden xl:block`

2. **Styling:**
   - Remove card-style per-member (`wd-bg-elevated` boxes)
   - Use flat list style like Discord (no individual borders)
   - Hover state: subtle background on member row
   - Role section headers with bottom margin/spacing

### Files Modified:
- `src/common/components/DeskMode/MemberPanel.tsx`

### Handoff: Phase 1 → Phase 2
After Phase 1 is done, create `MEMBER_SIDEBAR_HANDOFF.md` with:
- What was completed
- Current state of the component
- What remains for Phase 2

---

## Phase 2: Polish — Search, Status Indicators, Final Styling
**Scope:** Add search bar, online/offline status, and visual polish

### Changes:
1. **Search bar** at the top of the member panel
   - Filter members by name in real-time
   - Search icon + input styled to match mockup

2. **Online status dots** on avatars (if presence data becomes available)
   - Green dot for online, gray/no dot for offline
   - Position: bottom-right of avatar circle

3. **Offline dimming**
   - Members with offline status get reduced opacity

4. **Role label mapping**
   - Display friendly names: OWNER → "Owner", ADMIN → "Admin", etc.
   - Hide sections with 0 members

5. **Final styling pass**
   - Match spacing, font sizes, colors to mockup
   - Ensure consistency with rest of DeskMode UI

### Files Modified:
- `src/common/components/DeskMode/MemberPanel.tsx`

---

## Props Interface (unchanged)
```ts
interface MemberPanelProps {
  members: ChatV2RoomMember[];
  isLoading: boolean;
  onAddMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
}
```

## Existing Components to Reuse
- `UserAvatar` — avatar with image/sprite/initial fallback
- `getDisplayName` — nickname → name → fallback priority
- `Tooltip` / `TooltipContent` / `TooltipTrigger` — for hover actions
- `AddMemberModal` — for adding members
