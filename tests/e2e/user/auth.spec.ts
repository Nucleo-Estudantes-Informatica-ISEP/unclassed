import { expect, test } from "@playwright/test";

test("authenticated user can access the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("registration asks AuthNEI to create an account and preserves the return destination", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.route("**/api/auth/configured", (route) =>
    route.fulfill({ json: { configured: true } })
  );
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({ json: { zitadel: { id: "zitadel", type: "oidc" } } })
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { csrfToken: "test-csrf" } })
  );
  await page.route(/\/api\/auth\/signin\/zitadel(?:\?|$)/, (route) =>
    route.fulfill({
      json: { url: new URL("/register-complete", route.request().url()).href },
    })
  );
  await page.route("**/register-complete", (route) =>
    route.fulfill({ body: "Mock AuthNEI registration" })
  );

  const returnTo = "/dashboard?tab=swaps";
  await page.goto(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
  const requestPromise = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/signin/zitadel")
  );
  await page
    .getByRole("link", { name: "Ainda não tens conta? Cria uma agora" })
    .click();

  const request = await requestPromise;
  expect(new URL(request.url()).searchParams.get("prompt")).toBe("create");
  expect(new URLSearchParams(request.postData() ?? "").get("callbackUrl")).toBe(
    returnTo
  );
  await expect(page).toHaveURL(/\/register-complete$/);
});
