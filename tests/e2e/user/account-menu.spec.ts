import { expect, test } from "@playwright/test";

const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
};

for (const [name, viewport] of Object.entries(viewports)) {
  test(`account menu separates account and preferences on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Menu da conta" }).click();

    const accountLink = page.getByRole("link", { name: "Conta AuthNEI" });
    await expect(accountLink).toBeVisible();
    await expect(accountLink).toHaveAttribute("href", "/api/auth/profile-url");
    const accountRedirect = await page.request.get("/api/auth/profile-url", {
      maxRedirects: 0,
    });
    expect(accountRedirect.status()).toBe(307);
    expect(new URL(accountRedirect.headers().location).pathname).toBe(
      "/ui/console/users/me"
    );

    await page.getByRole("link", { name: "Preferências da aplicação" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(
      page.getByRole("heading", { name: "Preferências da aplicação" })
    ).toBeVisible();
  });
}
