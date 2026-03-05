# Role Management: Bug Fix + Role Assignment UI — Handoff

## Summary

Fixed role serialization bugs in the backend and added role-member assignment UI in Server Settings.

## Phase 1: Backend Serialization Fix

### Problem
- `workspace:role:list` returned raw Prisma objects with `permissions: bigint` (crashes JSON.stringify) and `isDefault` (frontend expects `isEveryone`)
- `workspace:role:create` and `workspace:role:update` converted `permissions` to string but didn't map `isDefault` → `isEveryone`
- `workspace:member:list` returned junction table objects (`{ role: {...} }`) without serializing role fields, and the role select was missing `permissions` and `isDefault`

### Fix
**`workdash-media-server/src/services/workspace.gateway.ts`:**
- Added `serializeRole()` helper that converts `permissions: bigint → string` and maps `isDefault → isEveryone`
- Applied to `workspace:role:list`, `workspace:role:create`, `workspace:role:update` handlers
- `workspace:member:list` now flattens junction table roles (`jr.role`) and serializes them

**`workdash-media-server/src/repositories/workspace/workspace.repository.ts`:**
- `listMembers()` role select expanded to include `permissions`, `isDefault`, `isHoisted`, `isMentionable`

## Phase 2: Role Assignment UI

**`workdash/src/common/components/DeskMode/modals/ServerSettingsModal.tsx`:**

Added a "Members" section to the role edit view (appears below permissions for non-@everyone roles):
- Shows count of assigned members
- "Add" button reveals dropdown of unassigned members
- Each assigned member has a hover-reveal remove button
- Uses existing `service.assignWorkspaceRole()` / `service.removeWorkspaceRole()` methods
- Members loaded via `service.listWorkspaceMembers()` on component mount
- Optimistic local state updates for assign/remove

## Verification Checklist
- [x] Backend type-checks clean (`npx tsc --noEmit`)
- [x] Frontend builds clean (`nvm use 20 && npm run build`)
- [x] Frontend lint passes (only pre-existing hex color warnings)
- [ ] Manual test: Create role → persists on reload
- [ ] Manual test: Edit role → saves correctly
- [ ] Manual test: Assign/remove member from role in Server Settings
- [ ] Manual test: Context menu role assignment still works
