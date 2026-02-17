# Desk Mode Handoff 24: Admin Right-Click Room Actions

## Scope
- Added an admin-only room context menu in Desk mode.
- Added persisted room rename/delete operations over `chat:v2` handlers.

## Frontend Changes
- Added admin-gated room context menu on room right-click with:
  - `Rename Channel`
  - `Delete Channel`
- Added modal-based flows (no browser prompts):
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/RenameRoomModal.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/DeleteRoomModal.tsx`
- Updated sidebar integration and actions:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`
- Added room mutation actions/state in store:
  - `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
- Added service calls:
  - `chat:v2:room:update`
  - `chat:v2:room:delete`
  - File: `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
- Added `viewerRole` on room type for UI gating:
  - `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/_types.ts`

## Backend Changes
- Added room mutation input types:
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- Added socket handlers:
  - `chat:v2:room:update`
  - `chat:v2:room:delete`
  - File: `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- Added service methods with moderation checks:
  - `updateRoom`: rename room
  - `deleteRoom`: archive room and compact positions
  - File: `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- Room list now includes per-viewer role data (`viewerRole`) for UI authorization:
  - `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-room.repository.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`

## Permission Model
- Frontend shows room context menu only when `viewerRole` is one of:
  - `OWNER`
  - `ADMIN`
  - `MODERATOR`
- Backend re-validates authority before applying rename/delete.

## Delete Semantics
- Room delete is an archive (`isArchived = true`), not hard delete.
- Room order in the same category is compacted after archive.
- Legacy default lobby room remains protected from deletion.

## Validation
- Frontend:
  - `npm run lint`
  - `npm run build`
  - `npx next dev -p 8091` readiness check
- Backend:
  - `npm run lint`
  - `npm run build`
