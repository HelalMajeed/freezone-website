# FreeZone Catalog Import — Dry-Run Summary

> DRY-RUN PLAN — no database was modified. Review before --apply.
> Source: `data/import/samples/example-products.json`

## Totals
- Products in feed: **6**
- Ready to publish: **3**
- Needs review (held as draft/pending): **2**
- With blocking errors: **0**
- Duplicate handles: **0**

## Quality flags
- Missing base cost: 1
- Missing/unusable main image: 2
- Missing specs: 0
- Competitor images (need approval): 1
- Margin outside 15–30%: 1
- Unknown category: 0

## By category
- cctv: 1
- laptops: 1
- monitors: 1
- networking: 1
- smart-home: 1
- accessories: 1

## By brand
- Hikvision: 1
- ASUS: 1
- LG: 1
- TP-Link: 1
- Tuya: 1
- Generic: 1

## Review queue
- **FZ-MON-EX-03** (monitors): price could not be computed (missing base cost / price); missing or unusable main image
- **FZ-NET-EX-04** (networking): missing or unusable main image; main image from competitor host needs approval
- **FZ-ACC-EX-06** (accessories): margin outside 15–30% range
