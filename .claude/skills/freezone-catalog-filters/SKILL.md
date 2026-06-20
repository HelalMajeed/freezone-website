---
name: freezone-catalog-filters
description: Use this skill for FreeZone product catalog, search, categories, brands, filters, product specs, variants, and dashboard catalog management.
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, Bash
---

# FreeZone Catalog Filters

Goal:
Build a scientific catalog/filter system suitable for a large tech store.

Rules:
1. Separate filterable facets from display specs.
2. Filterable facets are used for checkboxes, range filters, search refinement, and URL query state.
3. Display specs are used only on product detail/cards and should not always become filters.
4. Filters must be category-aware.
5. Do not show irrelevant filters for a category.
6. Category admin must support:
   - parent category
   - sort order
   - active/inactive
   - delete prevention if products exist
7. Product create/edit should be organized into tabs:
   - Basic
   - Pricing
   - Images
   - Filter Values
   - Display Specs
   - Variants
   - Preview
8. Imported product data must be normalized, not dumped randomly.
9. Do not create a filter value unless it is useful for buyer decisions.
10. Filters must sync with URL parameters.

For FreeZone categories:
- CCTV/Security Systems: resolution, channels, camera type, night vision, PoE, storage, brand.
- Computers: CPU, GPU, RAM, storage, use case, brand, form factor.
- Laptops: CPU, GPU, RAM, SSD, screen size, refresh rate, battery, brand.
- Monitors: size, resolution, refresh rate, panel type, ports, brand.
- Printers: type, color/mono, connectivity, function, brand.
- Networking: speed, ports, WiFi standard, PoE, brand.
- Accessories: compatibility, type, brand.

Before implementation:
- Inspect current DB schema/API.
- Propose minimal safe schema/API changes.
- Avoid destructive migrations.
- Provide rollback plan.
