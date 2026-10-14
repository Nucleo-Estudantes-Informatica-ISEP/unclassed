import { expect, test } from "@playwright/test";

test("authenticated admin can access the admin cron endpoint", async ({ request }) => {
  const res = await request.get("/api/admin/cron");
  expect(res.status()).not.toBe(401);
  expect(res.status()).not.toBe(403);
});
