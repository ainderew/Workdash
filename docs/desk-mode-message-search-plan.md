# Desk Mode Message Search Plan (v1)

Last updated: 2026-02-17
Owner: Desk chat v2
Scope: `/Users/AndrewPinon/projects/workdash` + `/Users/AndrewPinon/projects/workdash-media-server`

## 1) Goal

Add a Discord-like message search experience in Desk mode:
- Search input in the room header, aligned to the right.
- Filter by specific user (`from`) and optional specific room (`in`).
- Show results in the right-side panel.
- If only `from` is selected (no room filter), group results by room.
- Add sortable results with dropdown: `Latest first` or `Oldest first`.
- Add debounce so we do not query each keystroke.
- Add DB/query optimization for production quality performance.

This plan is decision-complete for implementation and future expansion.

## 2) Current-State Findings

Frontend:
- Desk header exists at `src/common/components/DeskMode/RoomHeader.tsx`.
- Right-side panel is currently `MemberPanel` in `src/common/components/DeskMode/MemberPanel.tsx`.
- Chat v2 store/service already exists (`chatV2Store`, `chatV2Service`) with socket ACK commands for room/message CRUD.

Backend:
- Socket gateway is `src/services/chat-v2.gateway.ts`.
- Message list currently supports room-scoped pagination only (`chat:v2:message:list`).
- `ChatMessage` has indexes on `(roomId, createdAt, id)` and `(senderUserId)`.
- No message search handler yet.

## 3) V1 Product Behavior

### 3.1 Header Search Bar

- Add search bar to the right side of `RoomHeader`.
- Placeholder: `Search <serverName>` (fallback `Search messages`).
- Search bar supports free text and filter chips:
  - `from:<user>`
  - `in:<room>`
- Clicking filter icon opens filter picker popover.

### 3.2 Filter Picker

- Filter picker includes:
  - `From a specific user`
  - `Sent in a specific channel`
- User picker supports typeahead (remote query).
- Room picker uses already loaded room list.
- Filter application writes chips into search state.

### 3.3 Debounce and Query Trigger

- Debounce interval: `350ms`.
- Query triggers on:
  - debounced text change,
  - filter change,
  - sort change.
- Minimum text length:
  - If text query present, require `>= 2` chars.
  - If `from` filter present, text can be empty.
- No query when all of text/from/room are empty.

### 3.4 Results Panel

- Replace right-side `MemberPanel` with search panel only while search is active.
- Header of results panel:
  - left: `<n> Results`
  - right: `(sort icon) Sort` button with dropdown:
    - `Latest first` (default)
    - `Oldest first`
- Results display:
  - If `from` only and `room` is empty: group by room sections.
  - Else: flat chronological list.
- Each result item includes:
  - avatar + sender name
  - room name (unless already in room group header)
  - timestamp
  - content snippet / attachment preview indicator
- Click result:
  - switches to target room,
  - loads message window around target message,
  - scrolls/highlights target message.

## 4) API Contract Additions

## 4.1 New Socket Command: `chat:v2:message:search`

Request:
```ts
type ChatV2MessageSearchPayload = {
  workspaceId?: string; // default legacy workspace
  query?: string; // free text
  fromUserId?: number;
  roomId?: string;
  sort?: "LATEST" | "OLDEST"; // default LATEST
  cursor?: { createdAt: string; id: string }; // keyset cursor
  limit?: number; // default 25, max 100
};
```

Response:
```ts
type ChatV2MessageSearchResult = {
  messages: ChatV2Message[]; // includes room + sender summary fields
  nextCursor: { createdAt: string; id: string } | null;
  totalCount: number | null; // null when expensive count skipped
};
```

Validation:
- Require at least one of: `query`, `fromUserId`, `roomId`.
- Enforce room access for current user.
- `sort` defaults to `LATEST`.
- Normalize and trim query.

## 4.2 New Socket Command: `chat:v2:user:search`

Purpose: filter picker typeahead for `from:<user>`.

Request:
```ts
type ChatV2UserSearchPayload = {
  workspaceId?: string;
  query: string;
  limit?: number; // default 10, max 30
};
```

Response:
```ts
type ChatV2UserSearchResult = {
  users: Array<{
    id: number;
    name: string | null;
    image: string | null;
  }>;
};
```

User source:
- Distinct users from rooms in workspace visible to requester (members + room creators).

## 5) DB + Query Optimization Plan

Search remains Postgres-native for v1 (single VM friendly, no extra infra).

### 5.1 Migration

Create new media-server migration: `chat_message_search_indexes`.

SQL (raw migration):
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- Full-text index on message content:
  - `CREATE INDEX "ChatMessage_content_fts_idx" ON "ChatMessage" USING GIN (to_tsvector('simple', coalesce("content", '')));`
- Partial composite index for sender+time:
  - `CREATE INDEX "ChatMessage_sender_created_idx" ON "ChatMessage"("senderUserId","createdAt","id") WHERE "deletedAt" IS NULL;`
- Partial composite index for room+sender+time:
  - `CREATE INDEX "ChatMessage_room_sender_created_idx" ON "ChatMessage"("roomId","senderUserId","createdAt","id") WHERE "deletedAt" IS NULL;`
- Optional trigram index for lightweight fallback matching:
  - `CREATE INDEX "ChatMessage_content_trgm_idx" ON "ChatMessage" USING GIN ("content" gin_trgm_ops);`

Note:
- Prisma schema stays mostly unchanged; expression/partial indexes are defined in SQL migration file.

### 5.2 Query Strategy

- Build accessible room set first (requester visibility).
- Use keyset pagination (`createdAt`, `id`) instead of offset.
- Apply filters in this order:
  1. `roomId`/accessible rooms
  2. `fromUserId` (if present)
  3. text query (fts, fallback to ILIKE/trgm when needed)
- Exclude soft-deleted messages.

### 5.3 Recommended SQL Pattern

- For text query:
  - `to_tsvector('simple', m."content") @@ websearch_to_tsquery('simple', $query)`
- For sort:
  - `ORDER BY m."createdAt" DESC, m."id" DESC` or ASC.
- For cursor:
  - directional tuple predicate on `(createdAt, id)`.

## 6) Frontend Architecture Changes

## 6.1 New Components

- `src/common/components/DeskMode/DeskMessageSearchBar.tsx`
- `src/common/components/DeskMode/DeskSearchFiltersPopover.tsx`
- `src/common/components/DeskMode/DeskSearchResultsPanel.tsx`
- `src/common/components/DeskMode/DeskSearchResultItem.tsx`
- `src/common/components/DeskMode/DeskSortDropdown.tsx`

## 6.2 Existing Component Updates

- `src/common/components/DeskMode/RoomHeader.tsx`
  - add right-aligned search bar.
- `src/common/components/DeskMode/DeskLayout.tsx`
  - switch right panel:
    - inactive search -> `MemberPanel`
    - active search -> `DeskSearchResultsPanel`
- `src/common/store/chatV2Store.ts`
  - add search state and actions.
- `src/communication/chatV2/chatV2Service.ts`
  - add `searchMessages` and `searchUsers`.
- `src/communication/chatV2/_types.ts`
  - add search payload/result types.

## 6.3 Search State Shape

```ts
type DeskSearchState = {
  query: string;
  fromUserId: number | null;
  fromUserDisplay: string;
  roomId: string | null;
  sort: "LATEST" | "OLDEST";
  isOpen: boolean; // results panel visibility
  isLoading: boolean;
  error: string | null;
  results: ChatV2Message[];
  groupedResults: Array<{ roomId: string; roomName: string; messages: ChatV2Message[] }>;
  nextCursor: { createdAt: string; id: string } | null;
};
```

## 6.4 Grouping Rule

- Group by room only when:
  - `fromUserId` is set, and
  - `roomId` is not set.
- Otherwise render flat list.

## 7) Performance and Reliability Rules

- Debounce 350ms on query/filter.
- Cancel stale in-flight requests with request token (`searchRequestId`) and ignore out-of-order responses.
- Keep last successful result while loading next search (avoid panel flicker).
- Limit initial page size to 25; load more on scroll.

## 8) Task Packets (Context-Safe Execution)

1. `desk-search-01-contracts-and-types`
- Add shared types and socket payload contracts.

2. `desk-search-02-backend-search-handler`
- Add `chat:v2:message:search` and `chat:v2:user:search` gateway handlers + service methods.

3. `desk-search-03-db-indexes`
- Add search indexes migration and verify on local DB.

4. `desk-search-04-header-search-ui`
- Add header search bar + filter popover + debounce wiring.

5. `desk-search-05-results-panel-and-sort`
- Add results panel, sort dropdown, grouped/flat rendering.

6. `desk-search-06-jump-to-message`
- Implement open-room and focus-highlight behavior on result click.

7. `desk-search-07-polish-observability`
- Loading/empty/error states, telemetry, and performance checks.

## 9) Acceptance Criteria

- User can search by:
  - free text,
  - `from:<user>`,
  - `from:<user> + in:<room>`.
- Search queries are debounced; no request per keystroke.
- Results can sort `Latest first` and `Oldest first`.
- `from`-only results are grouped by room.
- Clicking result navigates to message context in correct room.
- Queries run against indexed paths and remain responsive with large message volumes.

## 10) Future Expansion Hooks

- Add additional filters:
  - date range,
  - has:image/file/link,
  - mentions:user.
- Add saved/recent search history.
- Optional read-model search service (OpenSearch/Meilisearch) fed from broker events if Postgres-only search becomes insufficient.

## 11) Out of Scope (v1)

- Semantic/vector search.
- Cross-workspace global search.
- OCR/media content search.
