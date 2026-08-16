import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const prismaDirectory = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(prismaDirectory, "schema-manifest.json"), "utf8")
);
const schema = readFileSync(join(prismaDirectory, "schema.prisma"), "utf8").replace(
  /\r\n/g,
  "\n"
);
const schemaSha256 = createHash("sha256").update(schema).digest("hex");

if (manifest.currentSchemaSha256 !== schemaSha256) {
  throw new Error(
    "schema.prisma changed without a versioned schema-manifest entry"
  );
}

if (manifest.currentVersion !== manifest.changes.length) {
  throw new Error("Schema manifest versions must be sequential");
}

for (const [index, change] of manifest.changes.entries()) {
  if (change.version !== index + 1) {
    throw new Error("Schema manifest versions must start at 1 and be sequential");
  }
  if (!existsSync(join(prismaDirectory, change.file))) {
    throw new Error(`Missing schema change record: ${change.file}`);
  }
}

const latest = manifest.changes.at(-1);
if (latest?.schemaSha256 !== schemaSha256) {
  throw new Error("Latest schema change hash does not match schema.prisma");
}

console.log(
  `Schema manifest v${manifest.currentVersion} matches schema.prisma (${schemaSha256})`
);
