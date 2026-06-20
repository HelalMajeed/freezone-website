# FreeZone Catalog Quality Audit

> DRY-RUN AUDIT — derived from the feed; no database queried/modified.
> Source: `data/import/samples/example-products.json`

## Totals
- Products: 6 | Ready: 3 | Needs review: 2 | Errors: 0

## Images
- Missing main: 2
- Competitor (need approval): 1
- Invalid URL: 0
- Unsupported format: 0
- Gallery images total: 0

## Filters / facets
- With filter facets: 6
- Without filter facets: 0
- Products with irrelevant feed facets demoted: 0
- Coverage by category:
  - cctv: 1/1 have facets
  - laptops: 1/1 have facets
  - monitors: 1/1 have facets
  - networking: 1/1 have facets
  - smart-home: 1/1 have facets
  - accessories: 1/1 have facets

## Pricing
- Missing base cost: 1
- Missing computable price: 1
- Margin out of range (15–30%): 1
- Explicit-priced: 2 | Markup-priced: 3

## Review queue (3)
- FZ-MON-EX-03 (monitors): price could not be computed (missing base cost / price); missing or unusable main image
- FZ-NET-EX-04 (networking): missing or unusable main image; main image from competitor host needs approval
- FZ-ACC-EX-06 (accessories): margin outside 15–30% range
