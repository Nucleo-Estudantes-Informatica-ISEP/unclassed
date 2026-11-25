import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as userIdentityRepo from "@/application/repositories/userIdentityRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestUser,
} from "@tests/helpers/db";

describe("User OIDC identity persistence and unique constraints in MongoDB", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("links an external identity to a user and enforces uniqueness on [provider, providerSubject]", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    const identity = await userIdentityRepo.create({
      data: {
        provider: "zitadel",
        providerSubject: "auth-sub-12345",
        userId: user1.id,
      },
    });

    expect(identity.id).toBeDefined();
    expect(identity.userId).toBe(user1.id);

    // Linking the exact same provider + subject to user2 must fail via compound unique index
    await expect(
      userIdentityRepo.create({
        data: {
          provider: "zitadel",
          providerSubject: "auth-sub-12345",
          userId: user2.id,
        },
      })
    ).rejects.toThrow();
  });

  it("enforces 1-to-1 relationship preventing multiple identities for the same user", async () => {
    const user = await createTestUser();

    await userIdentityRepo.create({
      data: {
        provider: "zitadel",
        providerSubject: "auth-sub-primary",
        userId: user.id,
      },
    });

    // Attempting to link a second identity for the same user must fail via userId @unique constraint
    await expect(
      userIdentityRepo.create({
        data: {
          provider: "google",
          providerSubject: "auth-sub-secondary",
          userId: user.id,
        },
      })
    ).rejects.toThrow();
  });
});
