import { test, expect } from "playwright/test";
import { findCheapProduct, placeOrderViaApi, uniquePhone } from "./helpers";

/**
 * Public order tracking: an order placed with a unique phone is retrievable
 * by order number + phone and shows its status timeline. The order is created
 * through the real public API (the UI checkout journey is checkout.spec.ts).
 */

test("tracking a placed order by number + phone shows the timeline", async ({
  page,
  request,
}) => {
  const product = await findCheapProduct(request);
  const phone = uniquePhone();
  const orderNumber = await placeOrderViaApi(request, { product, phone, city: "basra" });

  await page.goto("/en/track-order");
  await page.locator("#fz-track-order-number").fill(orderNumber);
  await page.locator("#fz-track-phone").fill(phone);
  await page.getByRole("button", { name: "Track order" }).click();

  // Result card: order header + fresh status.
  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();
  await expect(page.getByText("Order received").first()).toBeVisible();

  // Timeline with at least the initial "pending" event.
  await expect(page.getByRole("heading", { name: "Order timeline" })).toBeVisible();
  await expect(page.locator("ol li").first()).toBeVisible();

  // Items + fulfillment are echoed back (item names are server snapshots in
  // Arabic — nameAr wins — so assert the row by quantity, not by English name).
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByText("×1").first()).toBeVisible();
  await expect(page.getByText("Home delivery")).toBeVisible();
});

test("a wrong phone does not expose the order", async ({ page, request }) => {
  const product = await findCheapProduct(request);
  const orderNumber = await placeOrderViaApi(request, { product, phone: uniquePhone() });

  await page.goto("/en/track-order");
  await page.locator("#fz-track-order-number").fill(orderNumber);
  await page.locator("#fz-track-phone").fill(uniquePhone()); // different shopper
  await page.getByRole("button", { name: "Track order" }).click();

  await expect(page.getByRole("alert")).toContainText("We couldn't find that order");
});
