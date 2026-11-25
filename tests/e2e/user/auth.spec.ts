import { expect, test } from "@playwright/test";

test("authenticated user can access the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

for (const [entry, path, name, returnTo] of [
  [
    "login",
    "/login?redirectTo=%2Fdashboard%3Ftab%3Dswaps",
    "Ainda não tens conta? Cria uma agora",
    "/dashboard?tab=swaps",
  ],
  ["home hero", "/", "Quero registar-me", "/profile"],
  ["home CTA", "/", "Começar agora", "/profile"],
  ["top bar", "/", "Criar conta", "/profile"],
]) {
  test(`registration from the ${entry} preserves the destination`, async ({
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
        json: {
          url: new URL("/register-complete", route.request().url()).href,
        },
      })
    );
    await page.route("**/register-complete", (route) =>
      route.fulfill({ body: "Mock AuthNEI registration" })
    );

    await page.goto(path);
    const requestPromise = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith("/signin/zitadel")
    );
    await page.getByRole("link", { name, exact: true }).click();

    const request = await requestPromise;
    expect(new URL(request.url()).searchParams.get("prompt")).toBe("create");
    expect(
      new URLSearchParams(request.postData() ?? "").get("callbackUrl")
    ).toBe(returnTo);
    await expect(page).toHaveURL(/\/register-complete$/);
  });
}
