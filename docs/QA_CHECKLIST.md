# QA Checklist — Freezone

Run before tagging a release. Automated suites gate merges in CI
(`.github/workflows/ci.yml`); the manual checks below cover journeys not yet
under automated E2E.

## Automated (must be green in CI)

- [ ] `freezone-web`: `npm run lint`, `npm run test`, `npm run build`.
- [ ] `freezone-api`: `npm run routes:check`, `npm run test`
      (coupon-service, rate-limit, catalog, admin-direct-login, and the four
      import-globaliraq suites), `npm run build`.
- [ ] `freezone-storefront`: `npm run build`.

## Storefront (manual)

- [ ] Home page loads (EN and AR/RTL).
- [ ] Product list (PLP) — filters, pagination, sorting.
- [ ] Product detail (PDP) — images via `/uploads/*`, specs, add-to-cart.
- [ ] Cart — quantity update, remove, totals.
- [ ] COD checkout — happy path creates an order.
- [ ] 404 page and error boundary render correctly.
- [ ] Bilingual: language switch persists; RTL layout correct in Arabic.

## Dashboard / Admin (manual)

- [ ] Direct-entry secret link gate fails closed when misconfigured.
- [ ] Login + session (`ADMIN_REQUIRE_PASSWORD=true`).
- [ ] Product CRUD (create, edit, delete, image upload).
- [ ] Order list + status update.
- [ ] Coupon create/apply math matches expectations.
- [ ] Rate limiting active on auth/sensitive endpoints.

## Accessibility

- [ ] Keyboard navigation through primary flows (home → PDP → cart → checkout).
- [ ] Visible focus states; no `window.alert/confirm` (uses `useToast`/`useConfirm`).
- [ ] Color contrast on key surfaces meets WCAG AA.
- [ ] Screen-reader labels on interactive controls and forms.

## Security / headers

- [ ] Edge security headers present on the storefront (HSTS,
      X-Content-Type-Options, X-Frame-Options/frame-ancestors,
      Referrer-Policy: no-referrer) — see `netlify.toml`.
- [ ] Secret admin link not leaked via Referer.

## References

- Deployment gate: `docs/DEPLOYMENT_CHECKLIST.md`
- Security review: `docs/SECURITY_REVIEW.md`
