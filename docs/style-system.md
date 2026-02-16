# Workdash Style System

## Purpose
This document is the source of truth for UI color usage.
When adding or updating UI, use semantic design tokens instead of hardcoded `neutral/cyan/...` classes.

## Token Source
All tokens are defined in:
- `/Users/AndrewPinon/projects/workdash/src/styles/globals.css`

Core semantic tokens:
- `--wd-surface-base`
- `--wd-surface-panel`
- `--wd-surface-panel-2`
- `--wd-surface-elevated`
- `--wd-surface-overlay`
- `--wd-border-subtle`
- `--wd-border-strong`
- `--wd-text-primary`
- `--wd-text-secondary`
- `--wd-text-muted`
- `--wd-accent`
- `--wd-accent-hover`
- `--wd-accent-soft`
- `--wd-success`
- `--wd-danger`
- `--wd-warning`
- `--wd-info`

## Standard Utility Classes
Prefer these classes before adding new one-off colors:
- `wd-bg-app`
- `wd-bg-panel`
- `wd-bg-panel-2`
- `wd-bg-elevated`
- `wd-bg-overlay`
- `wd-bg-accent-soft`
- `wd-bg-warning-soft`
- `wd-border-subtle`
- `wd-border-strong`
- `wd-text-primary`
- `wd-text-secondary`
- `wd-text-muted`
- `wd-text-accent`
- `wd-text-success`
- `wd-text-danger`
- `wd-text-warning`

## Reusable Component Classes
For consistent controls:
- `wd-card`
- `wd-input`
- `wd-btn-primary`
- `wd-btn-ghost`
- `wd-btn-danger`

## Rules For New UI
1. Use semantic token classes first.
2. If a needed color does not exist, add a semantic token in `globals.css` and document it here.
3. Do not introduce raw brand colors in component files unless there is a one-off visual exception with product approval.
4. Keep text contrast at AA minimum against the surface token being used.
5. For modals, use the `DeskModalShell` pattern or equivalent token-based shell.

## Migration Baseline (Completed)
Tokenized baseline is applied in:
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MemberPanel.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/GuildRail.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskModeControls.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/DeskModalShell.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/CreateRoomModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/CreateCategoryModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/modals/AddMemberModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControlsButton.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiOnlineButton.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/ReactionButton.tsx`

## Next Migration Targets
Prioritize these next for full consistency:
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/EditName.modal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/SettingsSelection.modal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/SoccerStatsModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/SoccerGameControlModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/MatchHistoryModal.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/modal/BackgroundMusicOptIn.modal.tsx`
