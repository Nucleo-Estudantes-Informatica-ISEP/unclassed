import { expect, test } from "@playwright/test";

test("app-only sign-out clears the Unclassed session and returns home", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.route("**/api/logout-url", () => {
    throw new Error("App-only sign-out must not fetch the AuthNEI logout URL");
  });

  await page
    .getByRole("button", { name: "Terminar sessão só nesta aplicação" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("shared sign-out clears the Unclassed session and follows the AuthNEI return", async ({
  page,
  baseURL,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Menu da conta" }).click();

  const issuer = new URL(
    process.env.AUTH_ISSUER_URL ?? "https://auth.example.test"
  ).origin;
  await page.route(
    (url) => url.origin === issuer,
    (route) => {
      const endSession = new URL(route.request().url());
      expect(endSession.origin).toBe(issuer);
      expect(endSession.pathname).toMatch(/\/end_session$/);
      expect(endSession.searchParams.get("post_logout_redirect_uri")).toBe(
        new URL("/", baseURL).href
      );
      return route.fulfill({
        status: 302,
        headers: { location: new URL("/", baseURL).href },
      });
    }
  );

  const logout = page.waitForRequest(
    (request) => new URL(request.url()).origin === issuer
  );
  const shared = page.getByRole("button", {
    name: "Terminar sessão nesta aplicação e no AuthNEI",
  });
  await expect(shared).toHaveAccessibleDescription(
    "Outras aplicações abertas podem manter a sessão iniciada."
  );
  await shared.click();
  await logout;
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
