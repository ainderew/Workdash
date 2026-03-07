# Chat Notifications Feature Handoff

## Summary
Added notification sound playback for unread messages and per-channel unread badges across desk mode and world mode (compact chat drawer). Sound respects user status (suppressed in focus/offline). Code-reviewed and all issues fixed.

## What Was Implemented

### 1. Notification Sound Hook (`src/common/hooks/useChatNotificationSound.ts`)
- New hook following `PollNotification.tsx` audio-priming pattern
- Creates `Audio('/assets/sounds/notification.mp3')` with volume 0.3
- Primes audio on first user click/keydown to satisfy browser autoplay policy
- Watches `unreadByRoomId` from `chatV2Store` -- plays sound when any room's count increases
- Explicitly skips `currentRoomId` in the check loop (defense-in-depth against race conditions)
- Reads `myStatus.statusId` from `presenceStore` -- suppresses sound when `focus` or `offline`
- Skips initial hydration (no sound blast on page load)
- Wired into both `DeskChatShell` and `CompactChatShell`

### 2. Per-Channel Unread Badges in ChannelSidebar (`src/common/components/DeskMode/ChannelSidebar.tsx`)
- Added `useChatV2Store` subscription for `unreadByRoomId`
- Each channel button now shows a red badge with unread count (matching `DirectMessageSidebar` / `GuildRail` badge pattern)
- Channel name text is bolded (fontWeight 500) when there are unreads
- Badge hidden when the channel is the active room (`isActiveRoom`)

### 3. Live Unread Counts for DMs (`src/common/components/DeskMode/DirectMessageSidebar.tsx`)
- Previously used stale `entry.room.unreadCount` (snapshot from initial fetch)
- Now reads from live `unreadByRoomId[entry.room.id]` with fallback to `entry.room.unreadCount`

### 4. Live Unread Counts in CompactChatShell (`src/common/components/DeskMode/CompactChatShell.tsx`)
- Added `unreadByRoomId` store subscription
- Channel badges now use `unreadByRoomId[room.id]` instead of stale `room.unreadCount`
- DM badges now use `unreadByRoomId[entry.room.id]` with fallback
- Both DM and channel badges gated with `!isActive` to prevent showing on active room

### 5. Stale Unread Merge Fix (`src/common/store/chatV2Store.ts`)
- Fixed `reloadRoomStructure` and `reloadDirectRooms` to spread server snapshot first, then local live counts on top (local takes precedence)
- Previously, stale server data overwrote live real-time unread increments

### 6. Workspace Unread Total Reactivity (`DeskChatShell.tsx` + `CompactChatShell.tsx`)
- Added `unreadByRoomId` to `workspaceOptions` useMemo dependency arrays
- `getWorkspaceUnreadTotal` is a stable function reference that doesn't trigger re-memo; adding `unreadByRoomId` ensures workspace rail badges update reactively

### 7. Status-Aware Notifications
- Sound suppressed when user status is `focus` or `offline` (via `presenceStore.myStatus.statusId`)
- `SILENT_STATUSES` Set defined outside hook to avoid per-render allocation
- `away` and `online` statuses still receive notification sounds (standard behavior)
- Matches existing UI copy under focus: "You will not receive desktop notifications"

## Key Design Decisions

### No notification when viewing the channel
Two layers of protection:
1. The `onMessageNew` handler in `chatV2Store.ts` (line ~560) skips incrementing `unreadByRoomId` when `currentRoomId === message.roomId` or the message is from the local user
2. The sound hook explicitly skips `currentRoomId` in its comparison loop (defense-in-depth for race conditions on reconnect/re-mount)

### Status-aware sound suppression
- `focus` = user explicitly wants no distractions (highest priority status)
- `offline` = user is disconnected, sound would be unexpected
- `away` = user is idle but still wants to be notified (standard Discord/Slack convention)

### Store-direct access (Option A)
`ChannelSidebar` reads `unreadByRoomId` directly from the store instead of receiving it as a prop. This is consistent with how other DeskMode components access the store and avoids changing the prop interface.

## Files Modified
| File | Change |
|------|--------|
| `src/common/hooks/useChatNotificationSound.ts` | **NEW** -- notification sound hook with `currentRoomId` + status guards |
| `src/common/components/DeskMode/ChannelSidebar.tsx` | Added `useChatV2Store` import, `unreadByRoomId` subscription, unread badge + bold text per channel |
| `src/common/components/DeskMode/DeskChatShell.tsx` | Added `useChatNotificationSound()` hook, `unreadByRoomId` subscription for workspace memo |
| `src/common/components/DeskMode/CompactChatShell.tsx` | Added `useChatNotificationSound()` hook, live unread counts with `!isActive` guards, fixed workspace memo deps |
| `src/common/components/DeskMode/DirectMessageSidebar.tsx` | Added `useChatV2Store` import, live `unreadByRoomId` for DM badges |
| `src/common/store/chatV2Store.ts` | Fixed merge order in `reloadRoomStructure` and `reloadDirectRooms` (local > server) |

## Code Review Issues Found & Fixed
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | Critical | Sound hook didn't cross-check `currentRoomId` -- could fire for active room on reconnect race | Added `currentRoomId` subscription + skip in comparison loop |
| 2 | Critical | CompactChatShell badges showed on active room (no `!isActive` guard) | Added `!isActive &&` gate to both DM and channel badges |
| 3 | Important | `reloadRoomStructure`/`reloadDirectRooms` overwrote live unreads with stale server data | Reversed spread order: server baseline first, local overrides on top |
| 4 | Important | `workspaceOptions` memo missed `unreadByRoomId` dep -- workspace rail badges went stale | Added `unreadByRoomId` to dependency arrays in both shells |
| 5 | Important | Notification sound ignored user status (played in focus/offline) | Added `presenceStore.myStatus.statusId` check with `SILENT_STATUSES` gate |

## Pre-existing Issues (Not Introduced)
- `CompactChatShell.tsx:925` -- missing `onToggleReaction` prop on `<ThreadPanel>` (TS2741)
- `ChannelSidebar.tsx:118` -- unused `presentation` prop (ESLint)
- `UserSettingsModal.test.tsx` / `chatV2Store.test.ts` -- Vitest `vi` types not available to tsc
- `profile-popover` -- `BannerConfig` type not yet exported

## Testing Notes
- To test: open two browser windows with different users, send a message from one to a channel the other user is NOT viewing
- Expected: notification sound plays, red badge appears on the channel in the sidebar
- When the receiving user clicks the channel, badge should clear (unread resets to 0 via `selectRoom`)
- No sound should play when viewing the active channel or for own messages
- Set status to "Focus" -- send a message from another user -- no sound should play, but badge should still appear
- Workspace-level badge on the guild rail should also update in real time
