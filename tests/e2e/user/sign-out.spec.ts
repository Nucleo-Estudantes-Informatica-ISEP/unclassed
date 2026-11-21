import { expect, test } from "@playwright/test";

test("app-only sign-out clears the Unclassed session and returns home", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Menu da conta" }).click();
  let fetchedSharedUrl = false;
  await page.route("**/api/logout-url", (route) => {
    fetchedSharedUrl = true;
    return route.abort();
  });

  await page
    .getByRole("button", { name: "Terminar sessão só nesta aplicação" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  expect(fetchedSharedUrl).toBe(false);
});

test("shared sign-out clears the Unclassed session and follows the AuthNEI return", async ({
  page,
  baseURL,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Menu da conta" }).click();

  const configuredIssuer = process.env.AUTH_ISSUER_URL;
  if (!configuredIssuer)
    throw new Error("AUTH_ISSUER_URL is required for shared sign-out testing");
  const issuer = new URL(configuredIssuer).origin;
  await page.route(
    (url) => url.origin === issuer,
    (route) =>
      route.fulfill({
        status: 302,
        headers: { location: new URL("/", baseURL).href },
      })
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
  const endSession = new URL((await logout).url());
  expect(endSession.origin).toBe(issuer);
  expect(endSession.pathname).toMatch(/\/end_session$/);
  expect(endSession.searchParams.get("post_logout_redirect_uri")).toBe(
    process.env.AUTH_POST_LOGOUT_REDIRECT_URI ?? new URL("/", baseURL).href
  );
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
