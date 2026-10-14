import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

const AUTH_DIR = path.join(__dirname, ".auth");

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const e2eSecret = process.env.E2E_TEST_SECRET;

  if (!e2eSecret) {
    throw new Error(
      "E2E_TEST_SECRET is not set. Set it in your .env.local and in CI secrets."
    );
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  for (const role of ["USER", "ADMIN"] as const) {
    const ctx = await request.newContext({ baseURL });

    const res = await ctx.get(`/api/auth/test-session?role=${role}`, {
      headers: { "x-e2e-secret": e2eSecret },
    });

    if (!res.ok()) {
      throw new Error(
        `test-session endpoint returned ${res.status()} for role ${role}. ` +
          "Make sure the app is running and E2E_TEST_SECRET matches."
      );
    }

    await ctx.storageState({
      path: path.join(AUTH_DIR, `${role.toLowerCase()}.json`),
    });

    await ctx.dispose();
  }
}
