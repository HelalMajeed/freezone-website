---
name: freezone-repo-intelligence
description: Use this skill before any FreeZone development task. It maps the monorepo, identifies affected frontend/backend files, checks scripts, routes, API contracts, deployment risk, and produces a safe implementation plan.
allowed-tools: Read, Grep, Glob, Bash
---

# FreeZone Repo Intelligence

Use this skill before coding.

Steps:
1. Read root package.json, freezone-web/package.json, freezone-api/package.json.
2. Read CLAUDE.md and all docs relevant to deployment, dashboard, API alignment, catalog, filters, admin, and storefront.
3. Map the frontend entry points:
   - freezone-web/src/App.*
   - routing files
   - navigation/i18n files
   - layout/header/footer/search/category/product components
   - product card components
   - catalog/filter/sidebar components
4. Map backend entry points:
   - freezone-api/src
   - Prisma schema
   - routes/controllers/services for products/categories/brands/orders/uploads/auth.
5. Identify risk:
   - production deployment risk
   - DB migration risk
   - API contract risk
   - UI regression risk
   - RTL/mobile risk
6. Output:
   - files that need editing
   - files that must not be touched
   - build/test commands
   - deployment checklist
   - rollback plan

Never implement during this skill. Only inspect, map, and plan.
