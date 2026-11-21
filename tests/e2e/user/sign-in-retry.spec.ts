import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("rechecks unavailable sign-in and offers NEI support after retry", async ({
  page,
}) => {
  await page.route("**/api/auth/configured", (route) =>
    route.fulfill({ json: { configured: false } })
  );

  await page.goto("/login");
  await expect(
    page.getByRole("alert").filter({ hasText: "temporariamente indisponível" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contactar o apoio do NEI" })
  ).toHaveCount(0);
  const recheck = page.waitForResponse("**/api/auth/configured");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await recheck;

  await expect(
    page.getByRole("link", { name: "Contactar o apoio do NEI" })
  ).toHaveAttribute("href", "mailto:info@nei-isep.org");
});

test("offers retry when a configured sign-in fails to start", async ({
  page,
}) => {
  await page.route("**/api/auth/configured", (route) =>
    route.fulfill({ json: { configured: true } })
  );
  await page.route("**/login", (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({ status: 503 });
    return route.continue();
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar para o login" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "temporariamente indisponível" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("link", { name: "Contactar o apoio do NEI" })
  ).toBeVisible();
});
