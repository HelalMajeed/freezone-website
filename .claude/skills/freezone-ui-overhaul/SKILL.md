---
name: freezone-ui-overhaul
description: Use this skill when improving the FreeZone storefront UI/UX, homepage, header, hero, category bar, product cards, search, responsive mobile layout, or RTL/Arabic experience.
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, Bash
---

# FreeZone UI Overhaul

Design direction:
- Premium Iraqi tech store.
- Clean white background with strong FreeZone red accents.
- Modern ecommerce like Amazon/Noon/Jarir but more focused and cleaner.
- Simple, fast, high trust.
- Avoid visual clutter.
- No placeholder text.
- No generic "TITLE / LINE 2".
- Hero content must be real and related to FreeZone products.
- Product cards must be clean and conversion-focused.
- Header must be consistent across desktop/mobile.
- Icons must be consistent in stroke, size, spacing, and visual language.
- Back arrows and navigation controls must always be consistent in direction, side, style, and RTL/LTR behavior.

Homepage priorities:
1. Fix header:
   - logo spacing
   - search bar
   - account/wishlist/cart
   - language switcher
   - sticky behavior if appropriate
   - mobile header/drawer
2. Fix hero:
   - real FreeZone campaign text
   - clear CTA
   - no random French/placeholder images/text
   - proper image sizing and readability
3. Fix trust bar:
   - delivery
   - genuine products
   - warranty
   - support
4. Fix categories:
   - better spacing
   - better icons
   - hover/active state
   - mobile horizontal scroll
5. Fix product cards:
   - image area
   - stock badge
   - price
   - warranty/spec preview
   - wishlist
   - compare
   - add to cart
6. Fix responsive:
   - 320px, 375px, 430px, 768px, 1024px, desktop
7. Fix accessibility:
   - buttons have labels
   - contrast readable
   - keyboard navigation not broken
8. Keep performance strong:
   - avoid huge bundles
   - lazy load heavy images/components

Implementation rules:
- Prefer reusable components.
- Avoid duplicate CSS.
- Use design tokens where possible.
- Do not break existing routes.
- Do not change API contracts unless necessary.
- After edits run build/lint.
