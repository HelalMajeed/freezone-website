import { test, expect } from "playwright/test";
import { ADMIN, adminLogin, useEnglishAdminUi } from "./helpers";

/**
 * Admin panel smoke. Two regressions this file guards permanently:
 *  - /admin must NEVER fall through to the storefront 404 (the route-hijack
 *    bug found and fixed during the 2026-06-10 QA pass: locale routes used to
 *    outrank the /admin splat, mounting the storefront with locale="admin");
 *  - legacy /dashboard/* deep links must keep working via the path-preserving
 *    redirect to /admin/*.
 *
 * Requires the seeded superadmin from e2e/README.md and an API started
 * WITHOUT ADMIN_DIRECT_LOGIN, so /admin/login falls back to the credential
 * form after its one direct-entry attempt.
 */

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await useEnglishAdminUi(page);
  });

  test("unauthenticated /admin shows the login form, not a 404", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
  });

  test("email login → products page → /dashboard redirect → sign-out", async ({ page }) => {
    await adminLogin(page, ADMIN.email, ADMIN.password);
    // Authenticated shell: sidebar navigation is up.
    await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();

    // Direct URL into a protected page renders (no guard bounce, no 404).
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();

    // Legacy /dashboard/* deep links redirect path-preserving to /admin/*.
    await page.goto("/dashboard/orders");
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

    // Sign out from the user menu → back on a WORKING login form.
    await page.getByRole("button", { name: ADMIN.name }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("phone-number login works as an identifier variant", async ({ page }) => {
    await adminLogin(page, ADMIN.phone, ADMIN.password);
    await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();
  });
});
