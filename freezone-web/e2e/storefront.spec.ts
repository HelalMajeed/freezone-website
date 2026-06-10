import { test, expect } from "playwright/test";
import { findCheapProduct } from "./helpers";

/**
 * Storefront smoke: home rails (en + ar with dir flip), category landing,
 * PDP (gallery / quantity selector / add-to-cart drawer), and the locale 404.
 */

test.describe("storefront", () => {
  test("English home renders product rails", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    // Rails/showcase render locale-prefixed product cards once the catalog loads.
    await expect(page.locator('a[href^="/en/product/"]').first()).toBeVisible();
  });

  test("Arabic home flips direction and keeps locale-prefixed links", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator('a[href^="/ar/product/"]').first()).toBeVisible();
  });

  test("category landing page renders the filtered grid", async ({ page }) => {
    await page.goto("/en/category/laptops");
    await expect(page.getByRole("heading", { level: 1, name: "Laptops" })).toBeVisible();
    // Count pill ("N products") + at least one product card in the grid.
    await expect(page.getByText(/\d+ products/)).toBeVisible();
    const cards = page.locator('a[href^="/en/product/"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    // Deep link into the full filter UI exists.
    await expect(
      page.getByRole("link", { name: "Browse with filters" }).first(),
    ).toBeVisible();
  });

  test("PDP shows gallery + quantity selector; add to cart opens the drawer", async ({
    page,
    request,
  }) => {
    const product = await findCheapProduct(request);
    await page.goto(`/en/product/${product.id}`);

    await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
    // Gallery main image (alt = product name).
    await expect(page.locator(`img[alt="${product.name}"]`).first()).toBeVisible();

    // Quantity selector: starts at 1, increase button bumps it to 2.
    const qtyInput = page.locator('input[type="number"]');
    await expect(qtyInput).toHaveValue("1");
    await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
    await expect(qtyInput).toHaveValue("2");

    await page.getByRole("button", { name: "Add to Cart" }).click();

    const drawer = page.getByRole("dialog", { name: "Your Cart" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(product.name)).toBeVisible();
    // Selected quantity carried into the cart (header count badge).
    await expect(drawer.getByText("2 items")).toBeVisible();

    // Drawer is dismissible.
    await drawer.getByRole("button", { name: "Close cart" }).click();
    await expect(drawer).toBeHidden();
  });

  test("unknown route renders the 404 UI with a noindex meta", async ({ page }) => {
    await page.goto("/en/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
    // SPA-on-static-host: HTTP status is 200, so the noindex meta is the SEO guard.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });
});
