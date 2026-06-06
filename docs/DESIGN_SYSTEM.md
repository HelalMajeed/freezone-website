# Freezone Dashboard Design System — Decision Record

**Status:** Accepted · **Scope:** `/dashboard` tree in `freezone-web` · **Date:** 2026-06-06

This record reconciles the two Stitch mockup packs (`_stitch_commerce/stitch_apex_commerce_suite`
and `_stitch_apex_admin`) with the existing `--fz-*` token architecture in
`freezone-web/src/app/dashboard/dashboard-shell.css`. Where the mockups disagree with each other
or with the brand, **this document wins**.

---

## 1. Decisions at a glance

| Topic | Decision |
| --- | --- |
| Brand color | Freezone crimson `#c90000` (`--fz-brand`), NOT the mockup reds (`#E53E3E`, `#b51822`) and NOT the commerce-suite blues |
| Neutrals | Slate scale (existing `--fz-bg/-elev/-soft/-border/-text*` tokens) |
| Token system | Keep `--fz-*` CSS custom properties + CSS modules. **No Tailwind**, no utility-class framework |
| Layout patterns | From `_stitch_commerce` (KPI row, chart + quick-actions split, 400px end drawer, two-column form + settings rail, 260/80px collapsible sidebar, breadcrumb topbar) |
| Component rules | From `_stitch_apex_admin` (3px active-nav bar, underline tabs, 1px-divider tables, focus rings) — but its palette is **ignored**; every mockup blue/red accent remaps to `--fz-brand` |
| Direction | Fully bilingual EN/AR. Logical CSS properties everywhere; directional icons mirror in RTL |
| Dependencies | None added for the shell. Charts use the already-installed `recharts`, fed by `--fz-chart-*` tokens |

---

## 2. Color

### 2.1 Palette

Brand (crimson) — the single accent. Use surgically: primary buttons, active nav, focus rings,
links-as-actions, first chart series.

| Token | Value | Use |
| --- | --- | --- |
| `--fz-brand` | `#c90000` | Primary actions, active states, 3px nav bar |
| `--fz-brand-600` | `#b00000` | Hover on primary actions |
| `--fz-brand-700` | `#8f0000` | Pressed / high-contrast text on tint |
| `--fz-brand-100` | `#fee2e2` | Focus glow, selected-row tint |
| `--fz-brand-50` | `#fef2f2` | Active-nav background tint |

Slate neutrals carry everything else:

| Token | Value | Use |
| --- | --- | --- |
| `--fz-bg` | `#f6f7fb` | Page floor (level 0) |
| `--fz-bg-elev` | `#ffffff` | Cards, sidebar, topbar (level 1) |
| `--fz-bg-soft` | `#f1f3f9` | Input fills, hover tints, table header rows |
| `--fz-border` / `--fz-border-strong` | `#e4e7ef` / `#cdd2df` | 1px separation everywhere |
| `--fz-text` / `--fz-text-soft` / `--fz-text-muted` | `#0f172a` / `#475569` / `#94a3b8` | Text hierarchy |

Status colors (`--fz-success/-warning/-danger/-info` + `*-bg`) stay as-is; they are feedback-only
and never decorative.

### 2.2 Mockup remap rule

The `_stitch_apex_admin` pack mixes Signal Red `#E53E3E`, Material red `#b51822`, and warm pink
surfaces; the commerce suite is built on blue `#1f53c9` with purple/teal accents. **None of these
ship.** Mechanical remap when transcribing a mockup:

- any mockup *primary/accent* (blue `#1f53c9`, `#406de4`, red `#E53E3E`, `#b51822`, …) → `--fz-brand`
- mockup *primary containers / tints* → `--fz-brand-50` / `--fz-brand-100`
- mockup warm/pink surfaces (`#fff8f7`, `#ffe9e7`, …) → slate neutrals (`--fz-bg`, `--fz-bg-soft`)
- mockup chart series (blue/purple/green) → `--fz-chart-1..5` (crimson first, then slate, amber, teal, violet)
- mockup dark sidebar (`#1A202C` Onyx) → **not adopted**; our sidebar stays light (`--fz-bg-elev`) to keep one surface system in both modes

### 2.3 Charts

Fixed series order via tokens — never hardcode hex in chart components:

`--fz-chart-1` (crimson) → `--fz-chart-2` (slate `#475569`) → `--fz-chart-3` (amber `#d97706`)
→ `--fz-chart-4` (teal `#0d9488`) → `--fz-chart-5` (violet `#7c3aed`), plus `--fz-chart-grid`,
`--fz-chart-axis`, and `--fz-chart-area-fill` (8% crimson) for area fills under the primary line.

---

## 3. Typography

Inter (Latin) paired with Tajawal (Arabic) via `--fz-font`; both keep consistent x-heights so
mixed-direction rows align. Scale (from the apex_admin spec, adopted unchanged):

| Role | Size / weight | Notes |
| --- | --- | --- |
| h1 / page title | 22–24px / 700 | tracking −0.02em |
| h2 / card title | 20px / 600 | tracking −0.01em |
| h3 / section | 16px / 600 | |
| body | 14px / 400 | dashboard base size |
| body-sm | 13px / 400 | table cells, helper text |
| label-caps | 11px / 700, uppercase, +0.05em | nav group headers, table headers, badges |
| mono-data | 13px / 500, `--fz-font-mono` | IDs, SKUs, money in tables (tabular lining) |

---

## 4. Layout patterns (from `_stitch_commerce`)

All measurements come from the commerce-suite spec (`base-unit: 8px`, `card-gap: 24px`,
`container-padding: 24px`) and are tokenized.

### 4.1 Spacing scale

8px linear scale: `--fz-sp-05` 4 · `--fz-sp-1` 8 · `--fz-sp-2` 16 · `--fz-sp-3` 24 ·
`--fz-sp-4` 32 · `--fz-sp-5` 40 · `--fz-sp-6` 48 · `--fz-sp-8` 64. Card internal padding is
24px (`--fz-sp-3`); gaps between cards 24px. Content max-width `--fz-content-max-w: 1600px`.

### 4.2 Shell

- **Collapsible sidebar:** `--fz-sidebar-w: 260px` expanded ↔ `--fz-sidebar-w-collapsed: 80px`
  icon rail. The preference persists in `localStorage` (`fz-dashboard-sidebar-collapsed`).
  Collapsed state hides labels and group headers (headers become 1px dividers); nav items get
  `title` tooltips. Below 900px the collapse preference is ignored — the sidebar becomes an
  off-canvas drawer.
- **Breadcrumb topbar:** sticky 60px (`--fz-topbar-h`) bar with hamburger (mobile only),
  breadcrumb trail (Dashboard › Section › Page, derived from the nav definition), quick search,
  language toggle and the user menu. The breadcrumb separator `›` is directional and mirrors in RTL.
- **Mobile drawer (< 900px):** sidebar slides in from the *start* edge over a
  `--fz-overlay` backdrop, with focus trap, `Esc` to close, body scroll-lock and focus restore
  to the hamburger. Slide direction follows reading direction (start-edge in LTR and RTL).

### 4.3 Page patterns

- **KPI row:** 4-up grid of stat cards (auto-fit, min 220px) at the top of overview pages —
  label-caps title, 24px metric, delta badge (`--fz-success`/`--fz-danger`), optional sparkline.
- **Chart + quick-actions split:** main chart card ≈ 2fr, end-side rail ≈ 1fr stacking
  "Quick actions" and a recent-items list. Collapses to a single column under 1100px.
- **End-side drawer:** complex edits open in a `--fz-drawer-w: 400px` drawer anchored to the
  *inline-end* edge (right in LTR, left in RTL), elevation 3, backdrop, never a route change.
- **Two-column form + settings rail:** create/edit pages put the main fields in the wide start
  column and a sticky settings/meta rail (status, visibility, organization) in a ~320px end column.

---

## 5. Components (rules from `_stitch_apex_admin`, palette remapped)

- **Active nav:** 3px crimson bar on the inline-start edge of the active item
  (`inset-inline-start`, so it flips for RTL) + `--fz-brand-50` background tint + brand text.
- **Tabs:** underline style. Active = 2px `--fz-brand` bottom border + `--fz-text`; inactive =
  `--fz-text-muted`, transparent border. No pill/segmented tabs in the dashboard.
- **Tables:** no zebra striping. Thin 1px `--fz-border` horizontal dividers; header row uses
  `--fz-bg-soft` with label-caps. Numeric columns use `--fz-font-mono` tabular figures and
  align to the *end*.
- **Focus rings:** every interactive element gets `:focus-visible` → 2px `--fz-brand` outline,
  2px offset (already global in `dashboard-shell.css`). Inputs on focus: white fill,
  `--fz-brand-600` border, 3px `--fz-brand-100` glow.
- **Buttons:** primary = solid `--fz-brand` / white text, hover `--fz-brand-600`; secondary =
  white + 1px `--fz-border` + `--fz-text`; ghost = `--fz-brand-50` tint, no border.
- **Elevation:** borders first, shadows second. `--fz-elev-0` page floor · `--fz-elev-1`
  cards/sidebar (1px border + faint shadow) · `--fz-elev-2` dropdowns/popovers · `--fz-elev-3`
  drawers/modals. Modal/drawer backdrop = `--fz-overlay`.
- **Radii:** `--fz-radius-sm` 6 (inputs, chips) · `--fz-radius` 10 (buttons, nav items) ·
  `--fz-radius-lg` 14 (cards, modals) · `--fz-radius-xl` 20 (hero cards). Nested elements use a
  smaller radius than their container.
- **Toggles:** track/thumb; active track `--fz-brand`, inactive `--fz-border-strong`.

---

## 6. RTL rules

1. **Logical properties only:** `margin-inline-start`, `padding-inline`, `inset-inline-end`,
   `border-inline-start`, `text-align: start/end`. Physical `left/right` is allowed *only* when
   intentionally direction-independent and must carry a comment.
2. **`dir` attribute** is set on `<html>` by `DashboardLayout` from the active locale; CSS keys
   off `[dir="rtl"]` for the rare cases logical properties can't express.
3. **Icon mirroring:** icons that encode *direction* (chevrons, arrows, breadcrumb separators,
   the sidebar collapse chevron) mirror with `transform: scaleX(-1)` under `[dir="rtl"]`. Icons
   depicting *objects* (search, mail, gear, trash) never mirror.
4. **Motion mirrors:** the mobile drawer and end-side edit drawer slide from the corresponding
   logical edge in each direction.
5. **Every user-facing string ships EN + AR** at the source (the `{ en, ar }` label pattern in
   `DashboardLayout`'s `NAV`, or the i18n message catalogs).

---

## 7. Non-goals / rejected alternatives

- **Tailwind** (used by the raw mockup HTML): rejected — the codebase standard is CSS modules
  over `--fz-*` tokens; introducing a utility framework would split the styling model.
- **Dark Onyx sidebar** from apex_admin: rejected to keep a single light surface system and
  simpler future dark-mode work (swap token values, not component styles).
- **Material-You surface ramp** from the stitch front-matter: collapsed into the existing
  3-surface slate system (`bg`, `bg-elev`, `bg-soft`).
- **New chart/icon libraries:** `recharts` and the existing glyph icons cover current needs.

## 8. Where things live

- Tokens: `freezone-web/src/app/dashboard/dashboard-shell.css` (`.dashboard-root` block)
- Shell (sidebar, drawer, topbar, breadcrumbs): `freezone-web/src/components/dashboard/DashboardLayout.tsx` + `layout.module.css`
- Shared primitives (Avatar, Badge, …): `freezone-web/src/components/dashboard/ui/`
- API contracts (frozen): `fz-ws1-backend/docs/API_CONTRACTS.md`
