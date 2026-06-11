import { test, expect, type Page } from "playwright/test";
import { addToCartViaPdp, findCheapProduct, uniquePhone, type CatalogProduct } from "./helpers";

/**
 * Guest COD checkout: happy path with the per-province delivery fee (Basra
 * 8,000 IQD from SiteConfig.shippingFeesJson), inline Iraqi-phone validation,
 * and the honest "coming soon" presentation of unconfigured gateways.
 */

const fmt = (n: number) => new Intl.NumberFormat("en").format(n);

/** Add the product to the cart on its PDP and continue to /en/checkout. */
async function startCheckout(page: Page, product: CatalogProduct): Promise<void> {
  await addToCartViaPdp(page, product);
  await page.getByRole("dialog", { name: "Your Cart" }).getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/en\/checkout/);
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  // The exiting PDP stays in the DOM during the route transition (framer-motion)
  // and its review form also has text/tel inputs — wait until only the checkout
  // step-1 fields remain so the fills below cannot land in the doomed page.
  await expect(page.locator('main input[type="text"]')).toHaveCount(2);
  await expect(page.locator('main input[type="tel"]')).toHaveCount(1);
}

/**
 * Step-1 contact fields render as unlabeled-for inputs; scoped to <main> so
 * the NavBar search box never matches. DOM order inside the card is stable:
 * text input #1 = full name, the tel input = phone, text input #2 = address.
 */
async function fillShippingStep(
  page: Page,
  opts: { name: string; phone: string; address?: string; city?: string },
): Promise<void> {
  const main = page.locator("main");
  await main.locator('input[type="text"]').first().fill(opts.name);
  await main.locator('input[type="tel"]').fill(opts.phone);
  if (opts.city) await main.locator("select").selectOption(opts.city);
  if (opts.address) await main.locator('input[type="text"]').nth(1).fill(opts.address);
}

test.describe("guest COD checkout", () => {
  test.beforeEach(async ({ context }) => {
    // Keep the WhatsApp order-handoff tab hermetic (no external traffic).
    await context.route(/https:\/\/(wa\.me|.*\.whatsapp\.com)\/.*/, (route) => route.abort());
  });

  test("happy path places a real order with the Basra fee (8,000 IQD)", async ({
    page,
    request,
  }) => {
    const product = await findCheapProduct(request);
    await startCheckout(page, product);

    await fillShippingStep(page, {
      name: "E2E Customer",
      phone: uniquePhone(),
      city: "basra",
      address: "Corniche street, building 4",
    });

    // Live per-province fee hint reacts to the governorate selection.
    await expect(page.getByText(/Delivery fee for your governorate: 8,000 IQD/)).toBeVisible();

    await page.getByRole("button", { name: "Continue to payment" }).click();

    // Step 2 — COD preselected for delivery.
    await expect(page.getByText("Cash on delivery").first()).toBeVisible();
    await page.getByRole("button", { name: "Review order" }).click();

    // Step 3 — totals show the Basra fee, not the flat/default fee.
    await expect(page.getByText(`${fmt(product.price)} IQD`).first()).toBeVisible();
    await expect(page.getByText("8,000 IQD").first()).toBeVisible();
    await expect(page.getByText(`${fmt(product.price + 8000)} IQD`).first()).toBeVisible();

    // Placing the order opens the WhatsApp handoff tab (blocked above).
    const popupPromise = page.waitForEvent("popup").catch(() => null);
    await page.getByRole("button", { name: "Confirm order (WhatsApp)" }).click();

    await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
    await expect(page.getByText(/Order FZ-\d+ is saved/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Track your order" })).toBeVisible();

    const popup = await popupPromise;
    if (popup && !popup.isClosed()) await popup.close();
  });

  test("invalid phone shows the inline error and blocks the step", async ({ page, request }) => {
    const product = await findCheapProduct(request);
    await startCheckout(page, product);

    await fillShippingStep(page, { name: "E2E Customer", phone: "12345", address: "Somewhere 1" });
    await page.getByRole("button", { name: "Continue to payment" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a valid Iraqi mobile number" }).first(),
    ).toBeVisible();
    // Still on step 1 — the phone field is present and flagged.
    await expect(page.locator('main input[type="tel"]')).toHaveAttribute("aria-invalid", "true");
  });

  test("gateway methods are visible but disabled with a coming-soon badge", async ({
    page,
    request,
  }) => {
    const product = await findCheapProduct(request);
    await startCheckout(page, product);

    await fillShippingStep(page, {
      name: "E2E Customer",
      phone: uniquePhone(),
      address: "Somewhere 1",
    });
    await page.getByRole("button", { name: "Continue to payment" }).click();

    // All five gateway options render disabled — never silently hidden, never
    // enabled. Each option <label> shows the method name + a coming-soon badge.
    for (const label of ["ZainCash", "Qi Card", "FIB (First Iraqi Bank)", "Visa", "Mastercard"]) {
      const option = page
        .locator("label")
        .filter({ hasText: label })
        .filter({ hasText: "Coming soon" })
        .first();
      await expect(option).toBeVisible();
      await expect(option.locator('input[name="pay"]')).toBeDisabled();
    }
    await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(5);
    await expect(page.locator('input[name="pay"][disabled]')).toHaveCount(5);

    // COD stays the enabled, selected default.
    await expect(page.locator('input[name="pay"]:not([disabled])')).toHaveCount(1);
    await expect(page.locator('input[name="pay"]:not([disabled])')).toBeChecked();
  });
});
