import { PrismaClient } from "@prisma/client";

import { mongoIndexSpecifications } from "./mongodb-indexes.mjs";

const prisma = new PrismaClient();
const auditOnly = process.argv.includes("--audit-only");

try {
  for (const specification of mongoIndexSpecifications) {
    const duplicateGroups = await prisma.$runCommandRaw({
      aggregate: specification.collection,
      pipeline: [
        { $match: { status: "ACTIVE" } },
        {
          $group: {
            _id: Object.fromEntries(
              specification.fields.map((field) => [field, `$${field}`])
            ),
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $count: "duplicateGroups" },
      ],
      cursor: {},
    });
    const firstBatch = duplicateGroups.cursor?.firstBatch;
    const duplicateGroupCount = Array.isArray(firstBatch)
      ? Number(firstBatch[0]?.duplicateGroups ?? 0)
      : 0;

    if (duplicateGroupCount > 0) {
      throw new Error(
        `${specification.collection} has ${duplicateGroupCount} duplicate ACTIVE request groups; resolve them before creating ${specification.index.name}`
      );
    }

    if (!auditOnly) {
      await prisma.$runCommandRaw({
        createIndexes: specification.collection,
        indexes: [specification.index],
      });
      console.log(`Ensured MongoDB index ${specification.index.name}`);
    }
  }

  if (auditOnly) {
    console.log("MongoDB active-request uniqueness audit passed");
  }
} finally {
  await prisma.$disconnect();
}
