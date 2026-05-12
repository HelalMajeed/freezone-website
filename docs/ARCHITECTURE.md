# Architecture — Freezone vs Commerce Suite

This repository contains **two product stacks**:

## 1. `freezone-api` + `freezone-web` (primary storefront)

- **API**: Express, route modules under `freezone-api/src/app/api/**`, Prisma schema for the live storefront (categories, products, orders, CMS, admin upload, etc.).
- **Web**: Vite + React SPA; public locale routes and embedded **admin** (`/admin/*`). Proxies `/api` and `/uploads` to the API in development.
- **When to use**: Default path for the customer-facing site and the current admin/CMS/product workflow.

## 2. `commerce-suite/` (parallel admin stack)

- **admin-api**: NestJS + Prisma with **separate** catalog-oriented models (e.g. `CatalogCategory`) intended to evolve without blocking the legacy schema.
- **admin-web**: Next.js App Router admin UI (ports `3010` / `3020` per `commerce-suite/README.md`).
- **When to use**: Greenfield catalog/RBAC experiments or a future cut-over once mapping from catalog models to storefront models is defined.

## Operational notes

- **Health**: `freezone-api` exposes `GET /health` (lightweight JSON). Docker Compose uses it for the `api` service healthcheck.
- **HTTP logs**: Set `LOG_HTTP=1` on the API process for one-line JSON request logs (off by default in production).
- **CI**: GitHub Actions runs lint, unit tests, and builds for `freezone-web`, `freezone-api`, and both commerce packages.

## Decision record (short)

Until an explicit migration plan exists, treat **Freezone** as the system of record for production storefront data. Treat **Commerce Suite** as an optional, isolated track for rebuilding admin/catalog concerns without destabilizing the live API.
