# Member Sidebar Redesign — Phase 1 → Phase 2 Handoff

## Phase 1 Completed
Rewrote `src/common/components/DeskMode/MemberPanel.tsx` with:

### What changed:
1. **Role-grouped member list** — Members are grouped by role in order: OWNER → ADMIN → MODERATOR → MEMBER → READ_ONLY
2. **Section headers** — Each role group has a header like `Owner — 1` (uppercase, muted, 11px)
3. **Avatar + name layout** — Each member row uses `UserAvatar` (size "sm") + display name side by side
4. **Flat list style** — Removed the card/box per member (`wd-bg-elevated` borders gone), now using a clean flat list with subtle hover background (`hover:bg-white/5`)
5. **Hover-reveal remove button** — Remove button (`UserRoundX` icon) is hidden by default, shown on hover via `group-hover:inline-flex`
6. **Scrollable body** — The member list area is now `overflow-y-auto` with flex layout so it scrolls independently of the header
7. **Extracted `MemberRow` component** — Separate function component for each member row, keeps the main component clean
8. **Empty role groups hidden** — Roles with 0 members don't render at all

### What was preserved:
- Props interface unchanged: `MemberPanelProps { members, isLoading, onAddMember, onRemoveMember }`
- `+ Add` button and `AddMemberModal` integration untouched
- Width `w-56`, responsive `hidden xl:block` behavior
- Loading and empty states
- Tooltip on remove button

### Component structure:
```
MemberPanel (aside)
├── Header: "Members" + "+ Add" button
├── Scrollable body
│   ├── Role Group (OWNER)
│   │   ├── Section header: "Owner — {count}"
│   │   └── MemberRow[] (avatar + name + hover remove)
│   ├── Role Group (ADMIN)
│   │   └── ...
│   └── ... (MODERATOR, MEMBER, READ_ONLY)
└── AddMemberModal (portal)
```

### Key implementation details:
- `ROLE_ORDER` array defines display order
- `ROLE_LABELS` maps role enums to friendly names
- `groupedMembers` is a `Map<role, members[]>` computed via `useMemo`
- `MemberRow` is a separate function component (not exported)

---

## Phase 2 TODO: Polish — Search, Status Indicators, Final Styling

### 1. Search/filter bar
- Add a search input at the top of the panel (below header, above member list)
- Filter members by display name in real-time
- Style: dark input with search icon, matching mockup
- Use local state `searchQuery` with case-insensitive filtering

### 2. Online status indicator dots
- Add a small green dot indicator on the bottom-right of the avatar for online members
- This requires checking if presence/status data is available on `ChatV2RoomMember` or needs to be added
- If no presence data exists yet, add a visual placeholder that can be hooked up later
- Position: absolute, bottom-right corner of the avatar circle

### 3. Offline member dimming
- Members with offline status should have reduced opacity (e.g., `opacity-50`)
- Their names should appear in muted color

### 4. Final styling pass
- Verify spacing matches Discord mockup closely
- Ensure font sizes, colors, and hover states feel polished
- Test with various member counts (0, 1, many per role)

### Files to modify:
- `src/common/components/DeskMode/MemberPanel.tsx` — search bar, status dots, dimming
- Potentially `src/common/components/DeskMode/UserAvatar.tsx` — if status dot is added to the avatar component itself

### Reference:
- Plan: `MEMBER_SIDEBAR_PLAN.md`
- Mockup: Discord-style sidebar with role sections, avatars, status dots, search bar
