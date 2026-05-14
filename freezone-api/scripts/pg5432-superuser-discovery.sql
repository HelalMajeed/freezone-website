-- Read-only discovery for PostgreSQL on 127.0.0.1:5432 (run as superuser, e.g. postgres).
-- Do not paste passwords into chat. Run locally, e.g.:
--   set PGPASSWORD=***   (in your shell only)
--   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f pg5432-superuser-discovery.sql

SELECT current_user AS connected_as, current_database() AS initial_db, version() AS server_version;

SELECT datname
FROM pg_database
WHERE datistemplate = false
ORDER BY datname;

-- After inspecting databases, connect to each candidate (e.g. \c freezone) and run the block below.

-- === Per-database: list public tables (run after \c targetdb) ===
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- === Per-database: Freezone-style counts (skip missing tables manually if needed) ===
SELECT COUNT(*) AS product_count FROM "Product";
SELECT COUNT(*) AS category_count FROM "Category";
SELECT COUNT(*) AS brand_count FROM "Brand";
SELECT COUNT(*) AS order_count FROM "Order";
SELECT COUNT(*) AS product_image_count FROM "ProductImage";
SELECT COUNT(*) AS audit_log_count FROM "AuditLog";
SELECT COUNT(*) AS cms_page_count FROM "CmsPage";
SELECT COUNT(*) AS cms_page_section_count FROM "CmsPageSection";
SELECT COUNT(*) AS site_config_count FROM "SiteConfig";
SELECT COUNT(*) AS hero_slide_count FROM "HeroSlide";
SELECT COUNT(*) AS home_spotlight_count FROM "HomeSpotlightItem";
SELECT COUNT(*) AS media_asset_count FROM "MediaAsset";
