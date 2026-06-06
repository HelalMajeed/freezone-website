# Freezone Storefront Design Spec (WS4-A)

No storefront mockups exist. This document **is** the design contract for the public
storefront inside `freezone-web` (the Next.js `freezone-storefront` migration is deferred).
Everything below is derived from the three fixed brand inputs:

1. **Brand crimson `#C90000`** (already the PWA `theme-color` and the hard-coded fallback
   across NavBar / CTA styles) — accents only, ~5% of any viewport.
2. **Typefaces:** **Inter** (EN/LTR) + **IBM Plex Sans Arabic** (AR/RTL), self-hosted.
3. **`src/theme/tokens.css`** is the single source of truth for color/space/radius/shadow.

Identity in one sentence: *white surfaces, black structure, crimson accents — a premium
retail storefront, not a gaming theme.*

---

## 1. Color system

`src/theme/tokens.css` `--color-*` is canonical. **No other file may declare a raw color
ramp.** Component CSS uses semantic tokens first, ramp steps second, raw hex never
(except `#fff`/`#000` on top of photography scrims).

### 1.1 Crimson ramp (re-centered on #C90000)

| Token | Value | Use |
|---|---|---|
| `--color-brand-50…300` | `#fdf3f3 → #ee8f8f` | tinted chips, focus washes |
| `--color-brand-400` | `#e25656` | decorative accents on dark |
| `--color-brand-500` | `#d62828` | hover tints on dark surfaces |
| `--color-brand-600` | **`#c90000`** | **the** brand accent (`--color-accent`) |
| `--color-brand-700` | `#a30000` | accent hover (`--color-accent-hover`) |
| `--color-brand-800` | `#7f0000` | pressed / deep accents |
| `--color-brand-900` | `#5c0000` | darkest accent, rarely used |

### 1.2 Semantic roles (already in tokens.css — unchanged contract)

- `--color-primary` `#0a0a0a` — structure: solid CTAs, logo mark, headings on light.
- `--color-accent` / `--color-accent-hover` — crimson; deals, badges, hover states, focus.
- `--color-bg-page / bg-card / bg-muted / border` — warm-gray neutrals (`--color-neutral-*`).
- `--color-text-primary / secondary / tertiary / on-brand`.
- System: `--color-success / warning / danger`.

### 1.3 Legacy alias policy (consolidation)

The gaming-era aliases in `globals.css` are **removed**, with usages rewritten:

| Legacy | Replacement |
|---|---|
| `--red-400/500/600/700/900` | `--color-brand-400/500` / `--color-accent` / `--color-accent-hover` / `--color-brand-900` |
| `--gray-50…950` | `--color-neutral-50…900` (`950` → `--color-surface-dark`) |
| `--accent-red/cyan` | `--color-accent` |
| `--accent-orange` | `--color-deal` |
| `--accent-amber` | `--color-warning` |
| `--accent-violet`, `--glow-red`, `--glow-amber`, `--shadow-red`, `--border-dark` | deleted (`--shadow-red` → `--shadow-brand`) |

Kept (they already resolve to `--color-*`, i.e. they *are* collapsed): the semantic
bridges `--bg-primary/--bg-secondary/--text-primary/--text-secondary/--border-light`,
the CMS-driven `--fz-*` vars written by `ThemeApplier`, and motion tokens
(`--ease-smooth`, `--ease-spring` — now in tokens.css).

**CMS payload compat:** published `featured_products` payloads may contain
`bgColor: "var(--gray-50)"`. A one-line compat alias (`--gray-50 →
var(--color-neutral-50)`) stays in `globals.css`, explicitly marked, until a data
migration rewrites stored payloads.

Scrollbar, `::selection` and `:focus-visible` are restyled neutrally: neutral track +
`--color-neutral-300` thumb (accent on hover), selection `--color-primary` on white,
focus ring `--color-accent`. The `pulse-glow` keyframe and `.glass*` gaming chrome are
deleted.

**Rule: no inline color styles in storefront TSX.** The only exception is *CMS-authored
data* (e.g. `topBarBgColor`, hero scrim opacity, trust-bar background) which is a value,
not a style decision — these stay inline because they come from the database.

---

## 2. Typography

### 2.1 Families (self-hosted — no Google Fonts request)

- EN/LTR: **Inter Variable** (`@fontsource-variable/inter`, weights 100–900, `woff2`).
- AR/RTL: **IBM Plex Sans Arabic** (`@fontsource/ibm-plex-sans-arabic`, 400/500/600/700).
- Both imported from `main.tsx` so Vite bundles `@font-face` with hashed, immutable URLs;
  `index.html` keeps only the `--font-inter` / `--font-ibm-arabic` var bridge.
- `font-display: swap` (fontsource default); system-ui fallback chain preserved.

### 2.2 Scale — `.fz-type-*` is the only heading/body scale

Defined in `tokens.css`, adopted by every new component and every component this stream
touches. Raw `font-size` declarations are allowed only for micro-chrome (badges ≤ 12px).

| Class | Size | Weight | Use |
|---|---|---|---|
| `.fz-type-h1` | `clamp(1.75rem, 2.5vw + 1rem, 2.75rem)` | 800 | hero/page title (one per page) |
| `.fz-type-h2` | `clamp(1.35rem, 1.2vw + 1rem, 2rem)` | 800 | section titles |
| `.fz-type-h3` | `1.125rem` | 700 | card group / rail titles |
| `.fz-type-h4` | `1rem` | 600 | card titles |
| `.fz-type-body` | `1rem` | 400 | copy |
| `.fz-type-small` | `0.875rem` | 400 | secondary copy |
| `.fz-type-caption` | `0.75rem` | 400 | meta, captions |

### 2.3 Arabic-specific tuning (`html[dir="rtl"]`)

- `letter-spacing: 0` everywhere (tracking breaks Arabic ligatures) — enforced globally,
  not per-component.
- `text-transform: none` (uppercase is meaningless in Arabic; also drop fake "EN caps"
  treatments under RTL).
- Display weight capped at **700** (Plex Arabic has no 800/900; never let the browser
  synthesize bold).
- Body `line-height` raised ~10% (1.6 → 1.75 for body, 1.3 → 1.45 headings) for
  ascender/descender room.
- Logical properties only (`margin-inline-start`, `padding-inline`, `inset-inline-end`);
  no `left/right` physical props in new CSS.
- Numerals stay Western (prices, counts) for catalog consistency.

---

## 3. Vertical rhythm

Strict 8px base grid using `--space-*` from tokens.css. **One rule:** every home section
is a `<section class="fz-section">` with block padding from a single scale — no ad-hoc
`padding: 40px 16px` literals.

| Token | Value | Use |
|---|---|---|
| `--rhythm-section` | `clamp(40px, 6vw, 72px)` | block padding between major home sections |
| `--rhythm-block` | `clamp(20px, 3vw, 36px)` | heading → content gap inside a section |
| `--rhythm-item` | `var(--space-4)` (16px) | grid/card gaps (dense rails may use `--space-3`) |

Section headers share one pattern: eyebrow (caption, accent) → `.fz-type-h2` title →
optional `.fz-type-small` subtitle, then `--rhythm-block` before the content. The CMS
`--fz-section-gap` continues to control inter-section spacing where the theme overrides it.

---

## 4. Shell

### 4.1 Header — 2 tiers, ≤ ~104px at top, 64px after scroll

Previous shell measured ~152px across 3 sticky tiers. New spec:

1. **Tier 1 — utility strip (~28px):** contact + promo + social, CMS-colored,
   collapses to 0 after 12px of scroll (existing behavior kept, padding tightened).
   Hidden < 480px.
2. **Tier 2 — main bar (64px):** logo · search pill (48px) · account / wishlist /
   language / cart. Sticky, white, hairline border (no heavy shadow).

There is **no tier-3 category bar**; category navigation lives in the mobile menu, the
mega-menu data feeds it, and `/products` owns deep filtering. Dead tier-3/mega CSS is
removed. `--fz-storefront-sticky-offset` keeps being published from a ResizeObserver;
its static fallback drops 152px → 96px.

### 4.2 Bootstrap split + instant shell

`storefront-bootstrap` was one blocking query with `staleTime: 0` +
`refetchOnWindowFocus: true` — the whole app white-screened on every focus-refetch race.
New contract (single HTTP endpoint, de-duplicated in flight, two cache policies):

- **`["storefront-shell", locale]`** — site config + theme + home CMS (no catalog).
  `staleTime: 30min`, `gcTime: 24h`, **seeded synchronously from a localStorage
  snapshot** (`fz:shell-snapshot:<locale>`, versioned) so returning visitors paint the
  real header/footer in the first render. Refreses in background.
- **`["storefront-catalog", locale]`** — products/categories/brands + homeSections.
  `staleTime: 2min`, no focus refetch, `placeholderData: keepPreviousData`.

While catalog is pending and a shell snapshot exists, the layout renders NavBar + Footer
chrome immediately with a skeleton `<main>`; only a true first-visit (no snapshot) shows
the full-page skeleton. Errors and maintenance screens are token-styled components
(`LocaleShellScreens`), bilingual EN+AR, zero inline colors.

### 4.3 Fonts

See §2.1 — removing the render-blocking `fonts.googleapis.com` stylesheet removes the
last third-party request from the critical path.

---

## 5. Homepage narrative

Fixed narrative order — the page must *always* tell this story, whether sections come
from CMS or fallbacks:

1. **Hero** (`hero` → `HeroSlider`) — promise.
2. **Categories** (`category_strip` / `categories_showcase`) — orient.
3. **Deals** (`banner_slider` / `promo_grid` / flash-deals rail) — urgency.
4. **Product rails** (`featured_products` / `tabbed_products` / hot & new rails) — depth.
5. **Trust** (`trust_bar` / `testimonials` / `faq`) — reassure.
6. **Showroom** (`showroom` → `StoreGallery`) + `cta` — physical-store proof, close.

`DynamicHomeSections` renders CMS sections in their stored order, then appends
**deterministic** fallbacks for missing narrative beats (categories → rails → showroom)
— replacing the old nested-ternary conditional appending. The legacy
(no-CMS-sections) homepage follows the same order via `HomeLegacyContent`.

### 5.1 CMS section → component map

Payload schemas are FROZEN in `fz-ws1-backend/docs/API_CONTRACTS.md §(j)`; renderers
ignore unknown keys, every renderer is a CSS-module component.

| `type` | Component | Notes |
|---|---|---|
| `hero` | `HeroSlider` | Unsplash fallback removed — on image error the slide falls back to a token gradient panel |
| `trust_bar` | trust bar block | CMS colors allowed inline (data) |
| `category_strip` | `CategoryIconStrip` | |
| `featured_products` | `ProductSlider` | |
| `brands_strip` | `BrandTicker` | |
| `promo_mega` | `HomeCommerceStack` | |
| `banner_slider` | **`BannerSlider`** (new) | autoplay 2–20s, `wide`/`banner` aspect, mobile crop, ≤10 items |
| `categories_showcase` | **`CategoriesShowcase`** (new) | `gaming_grid` preset → `GamingCategoriesGrid`; `manual` resolves category slug → image/name |
| `promo_grid` | **`PromoGrid`** (new) | layouts `2x2` / `3x1` / `1+2` |
| `tabbed_products` | `TabbedShowcase` | already payload-aware |
| `faq` | `FAQSection` | `manual` items or legacy `i18n` source |
| `testimonials` | **`TestimonialsSection`** (new, replaces inline styles) | |
| `cta` | **`CtaSection`** (new, replaces inline styles) | CMS `bg` allowed inline (data) |
| `split_richtext` | **`SplitRichtext`** (new, replaces inline styles) | logical `imageSide` |
| `showroom` | `StoreGallery` | |

---

## 6. Acceptance checklist for storefront PRs

- [ ] No `--red-*` / `--gray-*` / `--accent-*` / glow vars in changed files.
- [ ] No inline `style={{ color/background … }}` except CMS data values.
- [ ] Headings use `.fz-type-*`; section spacing uses the rhythm scale.
- [ ] Every user-facing string has EN + AR.
- [ ] Logical CSS properties only; verified visually in `dir="rtl"`.
- [ ] No new external requests (fonts, Unsplash, CDNs) on the critical path.
