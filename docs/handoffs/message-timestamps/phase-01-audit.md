# Phase 01 Handoff: Timestamp Audit

## Scope Completed
- Reviewed current timestamp rendering paths for chat in Desk Mode and 2D mode.
- Confirmed existing frontend formatting behavior and duplication hotspots.
- Confirmed backend message timestamp contract shape and schema requirements.

## Frontend Findings
- Chat timestamp formatting is currently duplicated in multiple UI files:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ThreadPanel.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskSearchResultsPanel.tsx`
- Current render style uses direct `toLocaleTimeString` or `toLocaleString`, without unified "Today / Yesterday / Older" semantics.

## Backend Findings
- Message payloads already include `createdAt` across list/search/thread and realtime fanout flows:
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
- Prisma schema already persists message timestamps via `ChatMessage.createdAt`:
  - `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`

## API / Schema Decision
- No database schema change is required for the timestamp display feature.
- No Prisma migration is required for this phase.

## Validation Results
- Audit-only phase; no runtime code changes yet.

## Open Risks
- Because timestamps are currently formatted in multiple components, inconsistent behavior can recur unless all surfaces are switched to a shared utility.
- Search panel timestamp formatting should stay aligned with primary message timeline formatting.

## Next Phase Checklist (Phase 02)
1. Add backend serialization utility for consistent timestamp wire format (ISO strings) in message payloads.
2. Apply serializer in gateway ack responses for list/search/thread/create/edit/delete.
3. Apply serializer in broker fanout realtime events for message new/update/delete/reaction.
4. Run backend `npm run lint` and `npm run build`.
5. Write backend phase handoff document.
