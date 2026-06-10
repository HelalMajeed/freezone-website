import { test, expect, type Page } from "playwright/test";
import { findProduct, uniquePhone } from "./helpers";

/**
 * Customer reviews on the PDP: submission lands in moderation (pending
 * message), and the same phone reviewing the same product again within 24h
 * hits the duplicate guard. The phone is unique per run, so the suite stays
 * green on reruns against the same database.
 */

async function fillReviewForm(
  page: Page,
  data: { name: string; phone: string; stars: number; comment: string },
): Promise<void> {
  const form = page.locator("form").filter({ hasText: "Write a review" });
  await form.getByLabel("Your name").fill(data.name);
  await form.getByLabel("Phone number").fill(data.phone);
  await form.getByRole("radio", { name: `Rate ${data.stars} out of 5` }).click();
  await form.getByLabel("Your review").fill(data.comment);
  await form.getByRole("button", { name: "Submit review" }).click();
}

test("submitting a review shows the pending-moderation message; a duplicate is rejected", async ({
  page,
  request,
}) => {
  const product = await findProduct(request, /Samsung 980/i);
  const phone = uniquePhone();
  const review = {
    name: "E2E Reviewer",
    phone,
    stars: 4,
    comment: "Fast drive, easy install, works perfectly in my build.",
  };

  await page.goto(`/en/product/${product.id}`);
  await expect(page.getByRole("heading", { name: "Customer Reviews" })).toBeVisible();

  const form = page.locator("form").filter({ hasText: "Write a review" });

  await fillReviewForm(page, review);
  await expect(form.getByRole("status")).toContainText(
    "Your review was received and will appear after moderation",
  );

  // Same phone + same product again (the form reset after success) → 409.
  await fillReviewForm(page, review);
  await expect(form.getByRole("alert")).toContainText(
    "already reviewed this product in the last 24 hours",
  );
});
