import { spawnSync } from "node:child_process";
import { join } from "node:path";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "validate"], {
  env: {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ?? "mongodb://localhost:27017/unclassed",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
