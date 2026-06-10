import { test, expect, type Page } from "playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { addToCartViaPdp, findCheapProduct } from "./helpers";

/**
 * Automated accessibility pass (axe-core) over the customer journey + the
 * admin login screen, in both directions (en LTR + ar RTL).
 *
 * Threshold policy (P1 "accessibility sweep", documented here on purpose):
 * - violations with impact "critical" FAIL the test;
 * - violations with impact "serious" are LOGGED to the console (with rule ids
 *   and node counts) but do NOT fail — they are tracked as follow-up work.
 *   Minor/moderate findings are ignored by this gate.
 *
 * Pages are scanned only after a stable anchor element is visible, with
 * reduced motion emulated so framer-motion transitions can't smear
 * color-contrast sampling mid-animation.
 */

type AxeImpact = "minor" | "moderate" | "serious" | "critical";

async function scan(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const byImpact = (impact: AxeImpact) =>
    results.violations.filter((v) => v.impact === impact);

  const serious = byImpact("serious");
  if (serious.length) {
    console.log(
      `[a11y][serious][${label}] ${serious
        .map((v) => `${v.id} ×${v.nodes.length}`)
        .join(", ")} (logged only — follow-up, does not fail the gate)`,
    );
  }

  const critical = byImpact("critical").map(
    (v) =>
      `${v.id}: ${v.help} → ${v.nodes
        .slice(0, 5)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
  expect(critical, `critical a11y violations on ${label}`).toEqual([]);
}

test.describe("accessibility (axe)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("English home has no critical violations", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('a[href^="/en/product/"]').first()).toBeVisible();
    await scan(page, "/en");
  });

  test("products listing has no critical violations", async ({ page }) => {
    await page.goto("/en/products");
    await expect(page.locator('a[href^="/en/product/"]').first()).toBeVisible();
    await scan(page, "/en/products");
  });

  test("product detail page has no critical violations", async ({ page, request }) => {
    const product = await findCheapProduct(request);
    await page.goto(`/en/product/${product.id}`);
    await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
    await scan(page, "/en/product/:id");
  });

  test("cart page (with an item) has no critical violations", async ({ page, request }) => {
    const product = await findCheapProduct(request);
    await addToCartViaPdp(page, product);
    await page.goto("/en/cart");
    await expect(page.getByText(product.name).first()).toBeVisible();
    await scan(page, "/en/cart");
  });

  test("checkout step 1 has no critical violations", async ({ page, request }) => {
    const product = await findCheapProduct(request);
    await addToCartViaPdp(page, product);
    await page.goto("/en/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.locator('main input[type="tel"]')).toBeVisible();
    await scan(page, "/en/checkout (step 1)");
  });

  test("contact page has no critical violations", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await scan(page, "/en/contact");
  });

  test("admin login form has no critical violations", async ({ page }) => {
    await page.goto("/admin/login");
    // With ADMIN_DIRECT_LOGIN unset the credential form renders (see helpers.adminLogin).
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await scan(page, "/admin/login");
  });

  test("Arabic home (RTL) has no critical violations", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator('a[href^="/ar/product/"]').first()).toBeVisible();
    await scan(page, "/ar");
  });

  test("Arabic product detail page (RTL) has no critical violations", async ({
    page,
    request,
  }) => {
    const product = await findCheapProduct(request);
    await page.goto(`/ar/product/${product.id}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scan(page, "/ar/product/:id");
  });
});
