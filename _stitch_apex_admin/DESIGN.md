---
name: The Design System
colors:
  surface: '#fff8f7'
  surface-dim: '#f0d4d1'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#ffe9e7'
  surface-container-high: '#ffe2df'
  surface-container-highest: '#f9dcd9'
  on-surface: '#271816'
  on-surface-variant: '#5b403e'
  inverse-surface: '#3e2c2b'
  inverse-on-surface: '#ffedeb'
  outline: '#8f6f6d'
  outline-variant: '#e4beba'
  surface-tint: '#b91c24'
  primary: '#b51822'
  on-primary: '#ffffff'
  primary-container: '#d93537'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb3ad'
  secondary: '#585e6c'
  on-secondary: '#ffffff'
  secondary-container: '#dde2f3'
  on-secondary-container: '#5e6473'
  tertiary: '#00666c'
  on-tertiary: '#ffffff'
  tertiary-container: '#008188'
  on-tertiary-container: '#f4ffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930013'
  secondary-fixed: '#dde2f3'
  secondary-fixed-dim: '#c1c6d7'
  on-secondary-fixed: '#161c27'
  on-secondary-fixed-variant: '#414754'
  tertiary-fixed: '#8cf2fa'
  tertiary-fixed-dim: '#6fd6dd'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f53'
  background: '#fff8f7'
  on-background: '#271816'
  surface-variant: '#f9dcd9'
typography:
  h1:
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-base:
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps:
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-padding: 2rem
  card-gap: 1.5rem
  element-padding-y: 0.75rem
  element-padding-x: 1rem
  sidebar-width: 260px
  sidebar-collapsed: 64px
---

## Brand & Style
This design system is built for enterprise-grade performance, emphasizing high-density information architecture without sacrificing clarity. The aesthetic is rooted in **Corporate Minimalism**, utilizing a stark monochromatic base to allow data and functional accents to take precedence. The emotional response is one of precision, authority, and reliability. 

The visual language focuses on "The Accent of Action," where color is used surgically to guide the user toward primary tasks. It utilizes modularity to ensure scalability across complex administrative workflows.

## Colors
The palette is intentionally restrained to maximize the impact of the primary accent.
- **Primary Base:** Absolute White (#FFFFFF) for surfaces and Card backgrounds.
- **Secondary Base:** Deep Onyx (#1A202C) for the navigation sidebar to provide a strong structural anchor.
- **Accent:** Signal Red (#E53E3E) is reserved for primary buttons, active states, and critical highlights.
- **Neutrals:** A spectrum of cool grays (Slate) manages borders, secondary text, and inactive states. 
- **Feedback:** Semantic colors follow industry standards but are calibrated for high legibility against white backgrounds.

## Typography
Inter is the engine of this design system. Its high x-height and exceptional legibility make it ideal for data-heavy admin panels. 
- **Headlines:** Use a tighter letter-spacing to maintain a "sharp" professional look.
- **Body Text:** Scaled to 14px for the primary interface to allow for high information density.
- **Labels:** Use uppercase for category headers and small labels to create clear visual distinction from dynamic data.
- **Data Tables:** Numeric data should utilize tabular lining to ensure columns align perfectly for easy scanning.

## Layout & Spacing
The layout follows a **Fluid Grid** model with fixed-width constraints for the sidebar. 
- **Sidebar:** Positioned on the left, it transitions between a full 260px state and a 64px icon-only state.
- **Main Canvas:** A light gray background (#F7FAFC) serves as the floor for white modular cards.
- **Spacing Rhythm:** An 8px linear scale is used. Consistent 24px (1.5rem) or 32px (2rem) gaps between cards provide "air" in an otherwise dense UI.
- **Content Max-Width:** While fluid, dashboard layouts should be capped at 1600px to maintain readability on ultra-wide monitors.

## Elevation & Depth
This design system uses **Tonal Layers** supplemented by **Ambient Shadows**. 
- **Level 0 (Background):** Neutral gray floor (#F7FAFC).
- **Level 1 (Cards/Sidebar):** Pure white surface with a 1px border (#E2E8F0). A very soft, 4% opacity black shadow with a 10px blur is applied to give cards a subtle "lift."
- **Level 2 (Modals/Dropdowns):** Higher elevation with a 10% opacity shadow and 20px blur to suggest foreground priority.
- **Separation:** Borders are the primary tool for separation; shadows are a secondary reinforcement.

## Shapes
The design system utilizes **Soft** geometry (4px radius). This maintains a professional, sharp look while avoiding the harshness of 0px corners.
- **Standard Radius:** 4px (0.25rem) for buttons, inputs, and checkboxes.
- **Large Radius:** 8px (0.5rem) for modular cards and modals.
- **Interactive Elements:** Successive nesting should maintain a proportional radius (e.g., a 4px button inside an 8px card).

## Components
- **Data Tables:** Zebra striping is avoided in favor of thin 1px horizontal dividers. The header row uses a light gray background (#EDF2F7) and bold labels.
- **Buttons:** Primary buttons are Solid Red (#E53E3E) with white text. Secondary buttons are white with a gray border and black text.
- **Forms:** Inputs use a 1px border; on focus, the border changes to Black with a subtle 2px Red outer glow (soft shadow).
- **Navigation:** Active sidebar items are indicated by a 3px thick Red vertical bar on the left edge and a subtle gray background tint.
- **Toggles:** Use a track/thumb metaphor. When active, the track is Red; when inactive, it is Light Gray.
- **Sliders:** The track is a light gray line; the "filled" portion and the handle are Red. Sliders for opacity include a checkerboard pattern background behind the track.
- **Tabs:** Underline style. The active tab is indicated by a Red 2px bottom border and black text; inactive tabs are gray.
- **Modals:** Centered with a semi-transparent dark overlay (60% opacity). They must have a clear "X" close action in the top right.