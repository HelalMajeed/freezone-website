-- Categories for storefront / admin when DB was created before they existed in seed data.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

INSERT INTO "Category" ("slug", "nameEn", "nameAr", "icon", "color", "sortOrder", "facetKeys", "createdAt", "updatedAt")
VALUES
  ('laptops', 'Laptops', 'لابتوبات', '💻', '#0369A1', 50,
   '["cpu","ram","storageType","screenSize","gpu"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('accessories', 'Accessories', 'إكسسوارات', '🎧', '#8B5CF6', 51,
   '["componentType"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('all-in-one', 'All-in-One', 'الكل في واحد', '🖥️', '#0EA5E9', 52,
   '["cpu","ram","storageType"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('smart-home', 'Smart Home', 'المنزل الذكي', '🏠', '#14B8A6', 53,
   '["systemType","os"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('phones', 'Phones', 'هواتف', '📱', '#6366F1', 54,
   '["ram","storageType","os"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('power-solutions', 'Power Solutions', 'حلول الطاقة', '🔋', '#CA8A04', 55,
   '["systemType","componentType"]'::jsonb, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON CONFLICT ("slug") DO NOTHING;
