---
name: freezone-dashboard-system
description: Use this skill when building or improving the FreeZone dashboard, admin/catalog management, product editor, category editor, order management, uploads, and dashboard navigation.
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, Bash
---

# FreeZone Dashboard System

Dashboard principles:
- Modern admin shell.
- Sidebar + topbar.
- Breadcrumbs.
- Global search.
- Mobile drawer.
- Clear empty states.
- Clear loading states.
- Clear error states.
- No broken admin legacy routes.
- Direct dashboard access only if current project policy says so.
- Do not introduce username/password unless explicitly requested.
- Protect dangerous actions with confirmation.

Dashboard sections:
1. Overview
2. Products
3. Categories
4. Brands
5. Orders
6. Uploads/media
7. Settings or site content if present

Product editor tabs:
- Basic
- Pricing
- Images
- Filter Values
- Display Specs
- Variants
- Preview

Quality:
- Forms must validate.
- Save buttons must show loading.
- API errors must be visible.
- Tables must have search, filters, pagination.
- Delete should soft-delete products where project convention says so.
- Category delete must be blocked when products exist.

Run checks after changes.
