# Refetch Design System

Refetch's interface borrows the calm of Apple's platforms — grouped backgrounds, rounded surfaces, frosted and Liquid Glass materials, SF typography and gentle spring motion — and keeps the identity that made Refetch recognizable: **the Refetch purple `#4e1cb3`**, the grey canvas and the green/red voting cues.

- **Live catalog:** `/design` renders every token and component in light and dark mode. It is unlisted (no links in the app, `noindex`); open it by URL.
- **Tokens:** [`src/styles/app.css`](src/styles/app.css)
- **Components:** [`src/components/ui`](src/components/ui)

---

## Principles

1. **Content first.** Stories and conversations are the interface. Chrome (navigation, toolbars) is translucent and quiet; it never competes with headlines.
2. **One clear action.** Each view has at most one filled (`primary`) button. Everything else is `secondary`, `tinted`, `plain` or `ghost`.
3. **Grouped, not boxed.** Collections live in a single rounded card with hairline separators (inset grouped lists), not in a stack of bordered boxes.
4. **Immediate feedback.** Votes, comments and deletions update optimistically, with springy, short motion. Errors roll back and explain themselves in a toast.
5. **Semantic, adaptive color.** Never hard-code hex values in components — use tokens, which flip automatically for dark mode.
6. **One logo, one purple.** The mark is always `#4e1cb3` with white arrows, in every theme. The wordmark is `#4e1cb3` in light mode and white in dark mode (`--logo-wordmark`). Never use grey or lavender versions, and don't place the logo on purple backgrounds.
7. **Accessible by default.** Visible focus rings, real buttons and links, labels on icon buttons, 44px-ish touch targets and `prefers-reduced-motion` support.

---

## Color

All colors are CSS variables defined for `:root` (light) and `.dark`, exposed as Tailwind utilities (`bg-*`, `text-*`, `border-*`, `ring-*`, …). Opacity modifiers work too (`bg-brand/10`).

### Brand

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `logo` | `#4e1cb3` | `#4e1cb3` | The logo mark — identical in every theme |
| `logo-wordmark` | `#4e1cb3` | `#ffffff` | The logo wordmark |
| `brand` | `#4e1cb3` | `#4e1cb3` | Primary buttons, selection, active indicators |
| `brand-hover` | `#5d2bc4` | `#5a25c8` | Hover on brand fills |
| `brand-pressed` | `#43169c` | `#43169c` | Pressed state |
| `brand-2` | `#7c3aed` | `#7c3aed` | Gradient partner (`brand-gradient`) |
| `brand-text` | `#4e1cb3` | `#9b7cf6` | Links, accents, ranks on surfaces (lifted in dark mode for contrast) |
| `brand-tint` | `#f3eeff` | `rgb(78 28 179 / .32)` | Tinted buttons, badges, highlights |
| `on-brand` | `#ffffff` | `#ffffff` | Text/icons on brand fills |

### Surfaces & fills

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `bg` | `#f5f5f7` | `#0e0d13` | Page background (grouped) |
| `surface` | `#ffffff` | `#17161e` | Cards, lists, widgets |
| `surface-secondary` | `#f5f5f7` | `#1f1e28` | Nested areas inside a card |
| `surface-raised` | `#ffffff` | `#23222d` | Elevated elements |
| `fill` | `rgb(118 118 128 / .12)` | `rgb(255 255 255 / .07)` | Control backgrounds, segmented tracks |
| `fill-secondary` | `rgb(118 118 128 / .08)` | `rgb(255 255 255 / .045)` | Hovers, inputs at rest |
| `fill-strong` | `rgb(118 118 128 / .20)` | `rgb(255 255 255 / .12)` | Pressed fills, disabled send button |
| `separator` | `rgb(0 0 0 / .08)` | `rgb(255 255 255 / .07)` | Hairlines between rows |

Dark mode is **Midnight**: near-black with a faint violet cast, so the purple feels native rather than pasted on. Fills are white at low opacity, so they keep that cast.

### Labels

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `label` | `#1d1d1f` | `#f3f2f7` | Titles and body text |
| `label-secondary` | `#6e6e73` | `#a9a7b5` | Supporting text, meta rows |
| `label-tertiary` | `#86868b` | `#7a788a` | Timestamps, captions, inactive icons |
| `label-quaternary` | `#aeaeb2` | `#4f4d5e` | Dot separators, low ranks, placeholders |

### Feedback

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `up` / `up-tint` | `#16a34a` / `#e9f8ef` | `#30d158` / tint | Upvotes, success |
| `down` / `down-tint` | `#dc2626` / `#fdeded` | `#ff453a` / tint | Downvotes, destructive actions, errors |
| `warning` / `warning-tint` | `#c2410c` / `#fff4e5` | `#ff9f0a` / tint | Warnings, near-limit counters |

---

## Typography

Titles use **Poppins**, the typeface of the Refetch wordmark: `text-large-title` through `text-title-3` switch to `font-display` automatically. Everything else is SF Pro (via `-apple-system`) on Apple devices and **Inter** elsewhere. Numbers that change — votes, ranks, stats — use **SF Pro Rounded** (`font-rounded`) with tabular figures (`tabular`).

| Utility | Size / weight | Use for |
| --- | --- | --- |
| `text-large-title` | 34 / bold | Page titles on large screens |
| `text-title-1` | 28 / bold | Page titles on phones, thread titles on desktop |
| `text-title-2` | 22 / bold | Section titles |
| `text-title-3` | 20 / semibold | Sub-sections (“Comments”) |
| `text-headline` | 17 / semibold | Emphasized lines, dialog titles |
| `text-body` | 17 / regular | Long-form text |
| `text-callout` | 16 / regular | Summaries, inputs, story titles (≥ sm) |
| `text-subhead` | 15 / regular | Default UI text, comments |
| `text-footnote` | 13 / regular | Meta rows, labels, buttons (sm) |
| `text-caption-1` | 12 / regular | Captions, section labels |
| `text-caption-2` | 11 / regular | Micro labels |

Each step carries its own line height and letter spacing, so you rarely need `leading-*` or `tracking-*`. Use `text-balance` for headings and `text-pretty` for paragraphs.

**Page header pattern:** eyebrow (`text-footnote font-semibold text-brand-text`) → title (`text-title-1 sm:text-large-title`) → description (`text-subhead text-label-secondary`). See `FeedHeader`.

---

## Shape, elevation & materials

| Token | Value | Use for |
| --- | --- | --- |
| `rounded-control` | 12px | Inputs, callouts |
| `rounded-card` | 20px | Cards, lists, widgets |
| `rounded-widget` | 22px | Large widgets, sheets |
| `rounded-full` | — | Buttons, pills, avatars |
| `shadow-card` | Subtle | Resting cards on the grouped background |
| `shadow-raised` | Medium | Floating composer, hover on cards |
| `shadow-popover` | Strong | Menus, dialogs, tooltips, toasts |
| `shadow-brand` | Purple glow | Hover on primary buttons |

**Materials**

| Utility | Use for |
| --- | --- |
| `glass` | The sticky navigation bar |
| `glass-strong` | Menus, dialogs, tooltips, toasts |
| `liquid-glass` | Floating controls over content: the mobile tab bar and its round action button |

**Liquid Glass** follows iOS 26: very translucent, a bright specular top edge, a light-catching rim (brighter top-left), and a lifted shadow. It floats — inset from the screen edges, never edge to edge. Elements using it must be positioned (`relative`, `fixed`, …) because the rim is drawn with a pseudo-element.

The mobile **tab bar** is a Liquid Glass capsule (Top, New, Show, Channels, Following) with a sliding "droplet" behind the selected tab and a separate round **Search** button that opens the command center. Submit lives in the header. The bar condenses to icons while you scroll down and expands when you scroll up.

`squircle` opts a surface into continuous corners where the browser supports `corner-shape`.

---

## Motion

| Token | Use for |
| --- | --- |
| `ease-apple` | Standard UI transitions (color, opacity) |
| `ease-out-expo` | Entrances (`animate-rise-in`, `animate-fade-in`, `animate-scale-in`) |
| `ease-spring` | Physical movement (segmented thumb, press scale) |

- `pressable` gives any control the UIKit-style press (scale `0.96`).
- Votes roll their numbers with `animate-count-up` / `animate-count-down`.
- Page changes cross-fade with the View Transitions API.
- Everything respects `prefers-reduced-motion`.

---

## Components

All primitives live in `src/components/ui` and accept `className` (merged with `cn()`, which understands our tokens).

| Component | File | Notes |
| --- | --- | --- |
| `Button` | `button.tsx` | Variants `primary`, `secondary`, `tinted`, `plain`, `ghost`, `outline`, `destructive`, `dark`; sizes `xs`–`xl` and `icon-*`; `loading`; `asChild` for links. |
| `Card`, `SectionLabel` | `card.tsx` | Rounded surface + uppercase section label. |
| `List`, `ListItem` | `card.tsx` | Inset grouped list. Set `--list-inset` on the list to align separators with row text. |
| `SegmentedControl` | `segmented-control.tsx` | iOS segmented control with a sliding thumb; radio-group keyboard behavior. |
| `Field`, `Callout` | `field.tsx` | Label + control + hint/error wiring (`aria-describedby`, `aria-invalid`); inline banners in four tones. |
| `Input`, `Textarea` | `input.tsx` | Filled controls that lift on focus; the textarea auto-grows. |
| `Badge` | `badge.tsx` | `neutral`, `brand`, `solid`, `success`, `danger`, `outline`. |
| `Avatar` | `avatar.tsx` | Deterministic gradient monogram — no network requests. |
| `Menu*` | `menu.tsx` | Radix dropdown with the frosted material; `destructive` items. |
| `ConfirmDialog` | `confirm-dialog.tsx` | Apple-style alert for destructive confirmations. |
| `Tooltip` | `tooltip.tsx` | Explain icons and truncated text. |
| `Toaster` | `toaster.tsx` | Frosted notification banners (via `sonner`'s `toast()`). |
| `Spinner`, `Skeleton`, `EmptyState`, `Kbd`, `Dot`, `Separator` | `spinner.tsx`, `misc.tsx` | Loading, empty and small inline helpers. |

Product components built on top: `VoteControl`, `PostRow`, `Favicon`, `Logo`, `RichText`, `BotBadge`, the insights widgets and the app chrome (`AppHeader`, `Sidebar`, `TabBar`).

**Channels** (`src/components/channels/channel-parts.tsx`):

- `ChannelIcon` — the channel's PNG icon (Storage bucket `channel-icons`) clipped to a rounded tile. Icons are 256×256, full bleed, a brand mark or Lucide glyph on the channel color. Without an icon it falls back to a two-letter glyph on the channel color.
- `ChannelTag` — a 16px icon (or colored dot) + name, first in a story's meta row. Hide it (`hideChannel`) inside that channel's own feed.
- `JoinButton` — optimistic join/leave; signed-out people go to sign-in.

**People**: `Avatar` takes a `userId` and shows the Appwrite Avatars photo over the gradient monogram (the monogram shows while loading and for Scout). Call `refreshAvatar(userId)` after a photo changes. `FollowButton` mirrors `JoinButton`.

**Messages** (`src/components/messages`): incoming bubbles use `fill-secondary`, your own use `brand`; consecutive messages within five minutes stack. Reactions are pills under the bubble, system events are centered captions, and shared stories render as a small card inside the bubble.

**Dialogs**: `Dialog` (`ui/dialog.tsx`) is the general sheet: bottom sheet on phones, centered on larger screens, with a title bar, scrolling body and footer actions. `ConfirmDialog` stays for destructive confirmations.

**Gated links**: signed-out visitors who open a story's link go to sign up, with the story shown above the form (`StoryTeaser`), and land on it afterwards. Guard outbound story links with `useJoinGate()` (`auth/join-gate.tsx`).

**Command center** (`src/components/command-center.tsx`): ⌘K / Ctrl+K or `/` anywhere, the header search field, or the tab bar's Search button. Groups, in order: Stories (server search on titles), Channels, Go to, Appearance. Every result is reachable with the keyboard.

### Example

```tsx
import { Button } from '@/components/ui/button'
import { Card, SectionLabel } from '@/components/ui/card'

export function Example() {
  return (
    <Card className="p-5">
      <SectionLabel>Today</SectionLabel>
      <h2 className="mt-2 text-title-3 text-label">Signal over noise</h2>
      <p className="mt-1 text-subhead text-label-secondary">Your daily drop of curated tech news.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary">Read article</Button>
        <Button variant="secondary">Share</Button>
      </div>
    </Card>
  )
}
```

---

## Patterns

- **Lists of stories:** `List` + `PostRow`. Rank numbers only where order means something (Top, Show); the first three are brand-colored.
- **Loading:** route-level `pendingComponent`s render skeletons in the final layout, so nothing jumps when data arrives.
- **Empty states:** icon, one-line title, one sentence, at most one action.
- **Errors:** inline `Callout` for forms; toasts for background actions; `RouteError` / `NotFound` for pages.
- **Destructive actions:** always confirm with `ConfirmDialog`, label the action with the verb (“Delete”).
- **Signed-out actions:** voting, commenting, joining channels and submitting send people to `/signin?redirect=…` and bring them back.
- **Copy:** short, plain sentences. No em dashes in the interface; use a comma, a colon or two sentences instead.

## Do & don't

- ✅ Use `text-label-secondary` for supporting text — ❌ don't use `text-gray-500`.
- ✅ Put collections in a single `List` — ❌ don't stack bordered cards with gaps.
- ✅ Keep one `primary` button per view — ❌ don't fill every action with purple.
- ✅ Use `glass` for chrome that floats over content — ❌ don't use it on cards.
- ✅ Use `font-rounded tabular` for counters — ❌ don't let numbers shift width as they change.
- ✅ Keep the mark `#4e1cb3` everywhere (white wordmark in dark mode) — ❌ don't use other colors or put it on a purple background.
- ✅ Label AI-generated content in words (“Generated by AI”) — ❌ don't use sparkle or magic-wand icons.

## Extending the system

1. Add the raw value to `:root` **and** `.dark` in `src/styles/app.css`.
2. Expose it in the `@theme inline` block (`--color-…`, `--shadow-…`).
3. If you add a new type size, radius, shadow or easing, register it in `src/lib/utils.ts` so `cn()` merges classes correctly.
4. Show it on the `/design` page (unlisted; don't link to it from the app).
