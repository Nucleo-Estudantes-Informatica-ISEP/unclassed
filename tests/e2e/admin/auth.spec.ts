import { expect, test } from "@playwright/test";

test("authenticated admin can access the admin cron endpoint", async ({ request }) => {
  const res = await request.get("/api/admin/cron");
  expect(res.status()).toBe(200);
});
