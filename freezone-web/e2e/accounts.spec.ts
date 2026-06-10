import { test, expect } from "playwright/test";
import { uniquePhone } from "./helpers";

/**
 * Customer accounts (real phone + password auth — replaced the old fake OTP
 * login). Registration uses a unique-per-run phone so reruns never trip the
 * PHONE_TAKEN guard.
 */

test.describe("customer accounts", () => {
  test("register lands on the account page; logout returns to guest state", async ({ page }) => {
    const phone = uniquePhone();

    await page.goto("/en/register");
    await page.locator("#register-name").fill("E2E Customer");
    await page.locator("#register-phone").fill(phone);
    await page.locator("#register-password").fill("Sup3rSecret!");
    await page.locator("#register-confirm").fill("Sup3rSecret!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/en\/account/);
    await expect(page.getByText("You are signed in.")).toBeVisible();
    // Profile card echoes the registered identity.
    await expect(page.getByText("E2E Customer").first()).toBeVisible();
    await expect(page.getByText(phone)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByText("You are signed in.")).toHaveCount(0);
  });

  test("login with a wrong password shows the credentials error", async ({ page }) => {
    await page.goto("/en/login");
    // Valid-format phone; account existence must not matter (no enumeration).
    await page.locator("#login-phone").fill(uniquePhone());
    await page.locator("#login-password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("Wrong phone number or password.");
    await expect(page).toHaveURL(/\/en\/login/);
  });
});
