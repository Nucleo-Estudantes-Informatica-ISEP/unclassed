#!/usr/bin/env node
// Cross-platform stand-in for `find src -name '*.test.ts' -exec node --test ...`.
// POSIX `find` and shell `**` globbing don't work the same way (or at all) under
// Windows cmd/PowerShell, so this walks src/ with Node's own recursive readdir
// and spawns `node --test` directly instead of going through a shell.

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.join(process.cwd(), "src");

const testFiles = readdirSync(root, { recursive: true })
  .filter((entry) => entry.endsWith(".test.ts"))
  .map((entry) => path.join(root, entry));

if (testFiles.length === 0) {
  console.error("No *.test.ts files found under src/");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--require",
    "ts-node/register/transpile-only",
    "--require",
    "tsconfig-paths/register",
    "--test",
    ...testFiles,
  ],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
