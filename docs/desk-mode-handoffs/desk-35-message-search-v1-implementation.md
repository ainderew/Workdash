# Desk 35 - Message Search v1 Implementation

## Scope
Implemented Desk mode message search with:
- header-right search bar,
- filters (`from` user, `in` room),
- debounced querying,
- sortable results (`Latest first` / `Oldest first`),
- room-grouped search results panel.

## Frontend Changes

### Header + Search UI
- Updated `src/common/components/DeskMode/RoomHeader.tsx`:
  - Added right-aligned search input.
  - Added filter popover:
    - user typeahead via `chat:v2:user:search`.
    - room selector.
  - Added clear controls for query/filters.

### Search Results Panel
- Added `src/common/components/DeskMode/DeskSearchResultsPanel.tsx`:
  - Results header with count and `Sort` dropdown.
  - Grouped rendering by room section (room heading shown once per group).
  - Message cards with sender, timestamp, and message snippet.

### Desk Layout Wiring
- Updated `src/common/components/DeskMode/DeskLayout.tsx`:
  - Added local search state and 350ms debounce.
  - Calls `chatV2Service.searchMessages(...)`.
  - Calls `chatV2Service.searchUsers(...)` for filter typeahead.
  - Shows search results panel in right pane while search is active.
  - Preserves `MemberPanel` when search inactive.
  - Selecting a search result jumps to room and highlights target message.

### Message Highlight on Result Click
- Updated `src/common/components/DeskMode/MessageList.tsx`:
  - Added optional `focusedMessageId` prop.
  - Scrolls to focused message and applies temporary highlight state.

### Chat v2 Client Contracts
- Updated `src/communication/chatV2/_types.ts`:
  - Added search-related types (`ChatV2MessageSearchInput`, `ChatV2MessageSearchSort`, `ChatV2SearchUser`).
- Updated `src/communication/chatV2/chatV2Service.ts`:
  - Added `searchMessages(...)`.
  - Added `searchUsers(...)`.

## Backend Changes

### Gateway Handlers
- Updated `workdash-media-server/src/services/chat-v2.gateway.ts`:
  - Added `chat:v2:message:search` handler.
  - Added `chat:v2:user:search` handler.
  - Added sort validation (`LATEST`/`OLDEST`).

### Service Methods
- Updated `workdash-media-server/src/services/chat-v2.service.ts`:
  - Added accessible-room resolver helper.
  - Added `searchMessages(...)` with access control, room scoping, sender filter, text filter, sorting, and count.
  - Added `searchUsers(...)` scoped to accessible workspace/rooms.

### Repository Methods
- Updated `workdash-media-server/src/repositories/chat/chat-message.repository.ts`:
  - Added `search(...)` helper.
  - Added `count(...)` helper.

### Type Contracts
- Updated `workdash-media-server/src/services/chat-v2.types.ts`:
  - Added search inputs/results/sort types.

## Database Optimization

### Prisma Schema and Migration
- Updated `workdash-media-server/prisma/schema.prisma`:
  - Added indexes on `ChatMessage`:
    - `[senderUserId, createdAt, id]`
    - `[roomId, senderUserId, createdAt, id]`

- Added migration:
  - `workdash-media-server/prisma/migrations/20260217202000_chat_message_search_indexes/migration.sql`
  - Includes:
    - `pg_trgm` extension enable,
    - GIN FTS index on content,
    - GIN trigram index on content,
    - composite B-tree indexes above.

## Validation

Frontend (`/Users/AndrewPinon/projects/workdash`):
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev -- -p 8091` readiness check passed.

Backend (`/Users/AndrewPinon/projects/workdash-media-server`):
- `npx prisma migrate deploy` applied `20260217202000_chat_message_search_indexes`.
- `npx prisma generate` passed.
- `npm run lint` passed.
- `npm run build` passed.

## Notes
- `prisma migrate dev` was blocked by pre-existing local DB drift unrelated to this feature (`MatchHistory` extra columns already present in DB but not in migration history). Used `migrate deploy` for non-destructive application of the new migration.
