import { env } from "@/lib/env";

export function isFixtureDatabase() {
  if (env.NODE_ENV !== "development" || !env.DATABASE_URL) return false;
  try {
    return new URL(env.DATABASE_URL).pathname === "/unclassed_e2e";
  } catch {
    return false;
  }
}
