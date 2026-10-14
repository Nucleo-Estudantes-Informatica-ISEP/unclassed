import { expect, test } from "@playwright/test";

test("authenticated user can access the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
});
