# Phase 07 Handoff: Mention ID Canonicalization (Backend)

## Scope Completed
- Added canonical mention token utilities in backend (`<@userId>` parsing).
- Updated message create flow to prioritize mention IDs parsed from tokenized content and validate them against active room members.
- Updated message edit flow to recompute and persist `mentionedUserIds` from tokenized content.
- Added strict validation for invalid mention tokens (rejects tokens for non-members in room).
- Kept compatibility fallback: when no mention tokens are present, backend still accepts client-provided `mentionedUserIds`.

## Files Changed (Backend)
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2-mention.util.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message.repository.ts`

## Contract Behavior
1. Canonical mention token format is now `<@123>` (numeric user ID).
2. Backend `createMessage` and `editMessage` derive canonical mention IDs from content tokens when present.
3. `mentionedUserIds` now stays in sync with canonical token content on edit, not only on create.

## Validation Results
- Command: `npm run lint` in `/Users/AndrewPinon/projects/workdash-media-server`
- Result: pass.
- Command: `npm run build` in `/Users/AndrewPinon/projects/workdash-media-server`
- Result: pass.

## Open Risks / Follow-ups
- Legacy plain-text mentions created before tokenized write-path remain plain text in DB.
- Some non-chat surfaces that render raw message content (if any) may need mention-token display formatting if they do not use mention-aware rendering.

## Exact Next-Phase Checklist
1. Re-read `/Users/AndrewPinon/projects/workdash/AGENTS.md` and `/Users/AndrewPinon/projects/workdash-media-server/AGENTS.md`.
2. Read this handoff and check git status in both repos.
3. Implement frontend tokenized mention write/render path.
4. Run frontend lint/build gates.
5. Write next handoff.
