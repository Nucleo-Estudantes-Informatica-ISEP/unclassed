import { mongoIndexSpecifications } from "./mongodb-indexes.mjs";

for (const specification of mongoIndexSpecifications) {
  if (Object.keys(specification.index.key).join(",") !== specification.fields.join(",")) {
    throw new Error(`${specification.index.name} key does not match its audit fields`);
  }
  if (specification.collection === "AuthSession") {
    if (specification.index.key.expiresAt !== 1 || specification.index.expireAfterSeconds !== 0) {
      throw new Error("Auth sessions must expire at expiresAt");
    }
    continue;
  }
  if (!specification.index.unique) {
    throw new Error(`${specification.index.name} must remain unique`);
  }
  if (specification.index.partialFilterExpression?.status !== "ACTIVE") {
    throw new Error(`${specification.index.name} must cover ACTIVE requests only`);
  }
}

console.log(`Validated ${mongoIndexSpecifications.length} MongoDB index specs`);
