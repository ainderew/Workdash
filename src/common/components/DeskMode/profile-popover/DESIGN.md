# Profile Flyout Popover — Design Spec

## Context

Extracted from `MessageList.tsx` (was 2542 lines, reduced to ~2013). Customizable banners added.

## Component Tree

```
profile-popover/
├── ProfilePopover.tsx          # Root: banner + identity (avatar, name, ID) + content
├── ProfileBanner.tsx           # Renders banner (color | gradient | image | default)
├── ProfileBannerEditor.tsx     # Self-only: compact inline swatch picker + upload
├── ProfileBioSection.tsx       # Bio display + inline edit (self)
├── ProfileActions.tsx          # Friend button, DM button, more-options dropdown
├── hooks/
│   ├── useProfilePopover.ts    # Profile fetch, outside-click dismiss, escape/scroll/resize
│   ├── useBioDraft.ts          # Bio editing state + save via chatV2Service
│   └── useBannerEditor.ts      # Banner selection, image upload, persist
├── constants.ts                # Presets, dimensions, re-exports BannerConfig
├── types.ts                    # SenderAvatar, ProfilePopoverState
└── index.ts                    # Barrel export
```

**5 components, 3 hooks.**

## Banner Data Model

```typescript
// In chatV2/_types.ts
type BannerConfig =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; gradient: string }
  | { type: 'image'; url: string }
  | null;

// ChatV2UserProfile.user.banner?: BannerConfig
```

Null = default gradient (`linear-gradient(120deg, rgba(88,101,242,0.18), rgba(15,17,21,0.98))`).

## Visual Layout

```
┌──────────────────────────────────────┐ 360px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ Banner (h-24, 96px)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ [👤+] [⋯] │ Action buttons (top-right)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ Self: hover shows "Edit Banner"
├───┬──────────────────────────────────│
│ ○ │                                  │ Avatar (64px, -mt-8 overlap)
├───┘                                  │
│ Display Name                         │
│ User ID: 12345                       │
│ ┌──────────────────────────────────┐ │
│ │ BIO                        [Edit]│ │
│ │ "Hello, I'm a developer..."      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │    💬 Send Private Message       │ │ Others only
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Banner Editor (self, ~180px max-height)

```
┌──────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓ live preview ▓▓▓▓▓▓▓▓▓▓▓│ h-24
├──────────────────────────────────────┤
│ BANNER STYLE                     [×]│
│ Colors                               │
│ [■][■][■][■][■][■][■][■]            │ 8 solid swatches, 1 row
│ Gradients                            │
│ [▰][▰][▰][▰][▰][▰]                 │ 6 gradient swatches, 1 row
│ [Upload] [Reset]    [Cancel] [Apply] │
└──────────────────────────────────────┘
```

## Presets

**8 solid colors:** Blurple (#5865F2), Green (#57F287), Yellow (#FEE75C), Pink (#EB459E), Red (#ED4245), Emerald (#3BA55D), Purple (#9B59B6), Teal (#1ABC9C)

**6 gradients:** Sunset, Ocean, Twilight, Warmth, Deep Sea, Berry

## API (2 endpoints)

1. **`chatV2Service.updateOwnUserProfile({ banner })`** — solid/gradient/reset via existing socket emit (`chat:v2:user:profile:update`). Reset = `{ banner: null }`.
2. **`POST /api/users/me/banner`** — image upload only (FormData). Returns `{ banner: { type: 'image', url: '...' } }`.

## Interaction

- **Banner hover (self):** Dark overlay fades in with pencil + "Edit Banner" label
- **Editor open:** Banner area stays h-24 as live preview; editor panel appears below, capped at 180px
- **Swatch select:** Instant preview, border highlight + checkmark
- **Apply:** Persists via API, closes editor. Cancel reverts.
- **Popover open:** `animate-in fade-in zoom-in-95 duration-150`

## Accessibility

- Swatches have `aria-label` (color name) and `aria-selected`
- Edit banner button has `aria-label="Edit profile banner"`
- Escape closes editor/popover, outside-click dismisses

## Theme Compatibility

- Preset colors are absolute (same across all 5 themes)
- Default gradient uses `rgba` values that work on any background
- Action buttons use `wd-bg-panel-2` with border for readability
