---
name: Unified Enterprise System
colors:
  surface: '#f8f9ff'
  surface-dim: '#c8dbfb'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d3e3ff'
  on-surface: '#061c34'
  on-surface-variant: '#434654'
  inverse-surface: '#1e314a'
  inverse-on-surface: '#ebf1ff'
  outline: '#747685'
  outline-variant: '#c3c6d6'
  surface-tint: '#2355cc'
  primary: '#1f53c9'
  on-primary: '#ffffff'
  primary-container: '#406de4'
  on-primary-container: '#fefcff'
  inverse-primary: '#b4c5ff'
  secondary: '#773fbe'
  on-secondary: '#ffffff'
  secondary-container: '#b47dfe'
  on-secondary-container: '#450087'
  tertiary: '#006856'
  on-tertiary: '#ffffff'
  tertiary-container: '#00846d'
  on-tertiary-container: '#f4fff9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174c'
  on-primary-fixed-variant: '#003daa'
  secondary-fixed: '#eddcff'
  secondary-fixed-dim: '#d8b9ff'
  on-secondary-fixed: '#290055'
  on-secondary-fixed-variant: '#5e22a5'
  tertiary-fixed: '#4efcd6'
  tertiary-fixed-dim: '#18dfba'
  on-tertiary-fixed: '#002019'
  on-tertiary-fixed-variant: '#005142'
  background: '#f8f9ff'
  on-background: '#061c34'
  surface-variant: '#d3e3ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 8px
  container-padding: 24px
  card-gap: 24px
  sidebar-width-expanded: 260px
  sidebar-width-collapsed: 80px
  drawer-width: 400px
---

## Brand & Style

This design system is built for high-scale enterprise environments that require a balance between professional density and modern approachability. The brand personality is efficient, clear, and sophisticated, aiming to reduce the cognitive load often associated with complex data management.

The aesthetic follows a **Corporate / Modern** movement, heavily influenced by soft minimalism. By utilizing generous whitespace and a "container-first" philosophy, the UI feels organized and airy. The emotional response should be one of confidence and ease, moving away from the stark, rigid grids of legacy software toward a more fluid, organic digital workspace.

## Colors

The color palette is anchored by a vibrant yet "soft" primary blue, supported by energetic purple and green accents used for categorization and status indicators. 

The background uses a very light, cool-toned gray to allow white card surfaces to "pop" via elevation rather than harsh borders. Accents should be used sparingly—primarily for call-to-action buttons, active navigation states, and data visualization highlights. This ensures that the user's attention is directed toward actionable insights without causing visual fatigue.

## Typography

The typography system relies on **Inter**, chosen for its exceptional legibility in data-heavy interfaces and its neutral, systematic character. 

Hierarchy is established through weight and color rather than drastic size changes. Headings use a semi-bold or bold weight with tighter tracking to feel cohesive, while body text maintains a standard weight for maximum readability. Labels and "overlines" use an uppercase style with increased letter spacing to differentiate metadata from primary content. For RTL support, Inter pairs seamlessly with standard Arabic sans-serif fonts, maintaining consistent x-heights across multi-language implementations.

## Layout & Spacing

The layout utilizes a **fluid 12-column grid** system with fixed-width margins and gutters. The philosophy centers on "logical properties" to ensure seamless LTR and RTL compatibility; margins and paddings are defined as `start` and `end` rather than `left` and `right`.

Main content lives within cards that follow a consistent 24px internal padding. The sidebar is collapsible to maximize the data viewing area on smaller screens. For complex editing tasks, a side drawer emerges from the "end" of the viewport, overlaying the content without breaking the user's context.

## Elevation & Depth

Hierarchy is communicated through **Ambient Shadows** and tonal layering. The interface avoids heavy borders, preferring to use soft, diffused shadows to lift cards off the light-gray background tray.

- **Level 0 (Background):** The base canvas, utilizing the neutral background color.
- **Level 1 (Cards/Sidebar):** Pure white surfaces with a subtle, 10% opacity shadow (blur: 20px, y-offset: 4px) tinted with the primary blue.
- **Level 2 (Popovers/Drawers):** Slightly higher elevation with a more pronounced shadow to indicate temporary interaction layers.
- **Interactive Depth:** Buttons and clickable cards should subtly increase their shadow spread or shift brightness on hover to provide tactile feedback.

## Shapes

The design system adopts a **Rounded** shape language to evoke a modern, friendly enterprise feel. 

Standard components like input fields and small buttons use a 0.5rem (8px) radius. Larger layout containers, such as dashboard cards and sidebars, utilize a 1rem (16px) radius to create a distinct, nested look. Pill-shaped buttons are reserved for specific high-priority actions or status tags (chips) to provide visual variety and emphasize their interactive nature.

## Components

### Buttons & Inputs
Buttons feature a generous horizontal padding and a medium height (approx 40px). Primary buttons use a solid fill of the primary color, while ghost buttons use a subtle background tint of the brand color instead of a border. Input fields are styled with a light-gray background that turns white on focus, paired with a soft primary-colored ring.

### Cards
Cards are the primary structural element. They must include a title header area, a body for content/charts, and an optional footer for actions. Content within cards should respect the 24px "safe area" to maintain the clean, minimal aesthetic.

### Interactive Charts
Charts should utilize the accent palette (blue, purple, green). Lines should be slightly smoothed (cardinal splines) with data points appearing on hover. Tooltips must follow the card elevation style—white backgrounds with soft shadows.

### Side Drawers & Sidebar
The sidebar uses a "vertical-lite" approach, where icons are paired with labels that disappear when collapsed. Drawers slide in from the screen edge with a backdrop blur on the main content area to keep the user focused on the editing task.

### RTL Logic
All components must mirror automatically. Icons that denote direction (arrows, chevrons) must be flipped, while icons representing physical objects (search, mail) remain static. Navigation items must right-align for Arabic locales.