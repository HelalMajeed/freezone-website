# Commerce Suite — مؤرشف

تمت إزالة مجلد `commerce-suite/` من `main` بموجب [ADR-001](../adr/001-retire-commerce-suite.md).

## استرجاع الكود

```bash
git log --oneline -- commerce-suite/
git checkout <commit-before-removal> -- commerce-suite/
```

## البديل

- **إنتاج:** `freezone-api` + `freezone-web`
- **واجهة SEO:** `freezone-storefront/` (Next.js)
