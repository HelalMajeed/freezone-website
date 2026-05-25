-- Issue #2: imported products had oldPrice = sourcePrice (the pre-markup price),
-- which is BELOW the displayed price, so the storefront rendered a misleading
-- "discount" that actually looked like a price increase. Null it out for every
-- imported row where oldPrice still equals sourcePrice. sourcePrice itself is
-- untouched (admin-only reference column). Idempotent + data-only.

UPDATE "Product"
   SET "oldPrice" = NULL
 WHERE "sourceHandle" IS NOT NULL
   AND "oldPrice" IS NOT NULL
   AND "oldPrice" = "sourcePrice";
