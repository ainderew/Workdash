# Phase 03 Handoff: Frontend Timestamp Utility

## Scope Completed
- Added a single shared formatter utility for chat message timestamps with required human-readable rules.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/utils/messageTimestamp.ts` (new)
- `/Users/AndrewPinon/projects/workdash/docs/handoffs/message-timestamps/phase-03-frontend-utils.md` (new)

## Formatter Behavior
- Today: `h:mm AM/PM`
- Yesterday: `Yesterday at h:mm AM/PM`
- Older: `MMM dd, yy at h:mm AM/PM`
- Handles invalid dates safely by returning an empty string.

## API / Schema Decision
- No frontend contract/type changes required in this phase.
- No backend schema/migration changes required.

## Validation Results
- `npm run lint` (pass)

## Open Risks
- UI surfaces still need to adopt this utility in all timestamp render points.

## Next Phase Checklist (Phase 04)
1. Replace local timestamp formatters in desk + 2D chat surfaces with this utility.
2. Ensure search result timestamp display uses the same utility.
3. Run frontend `npm run lint`.
4. Write phase-04 handoff.
