import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

const CLEANUP_FILE = path.join(__dirname, ".auth", "cleanup.json");

export default async function globalTeardown() {
  if (!fs.existsSync(CLEANUP_FILE)) return;

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const e2eSecret = process.env.E2E_TEST_SECRET;
  if (!e2eSecret) return;

  const { users } = JSON.parse(fs.readFileSync(CLEANUP_FILE, "utf8")) as {
    users: { id: string }[];
  };

  const ctx = await request.newContext({ baseURL });
  for (const { id } of users) {
    await ctx
      .delete("/api/auth/test-session", {
        headers: { "x-e2e-secret": e2eSecret },
        data: { userId: id },
      })
      .catch(() => {});
  }
  await ctx.dispose();

  fs.rmSync(CLEANUP_FILE);
}
