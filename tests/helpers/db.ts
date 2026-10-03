import * as bundleSwapRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";
import * as cronExecutionRepo from "@/application/repositories/cronExecutionRepository";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as matchNotificationRepo from "@/application/repositories/matchNotificationDeliveryRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as rateLimitRepo from "@/application/repositories/rateLimitRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import * as subjectRepo from "@/application/repositories/subjectRepository";
import * as userIdentityRepo from "@/application/repositories/userIdentityRepository";
import * as userRepo from "@/application/repositories/userRepository";

/**
 * Validates that the active DATABASE_URL is explicitly configured for an ephemeral
 * test or integration database. Prevents tests from running against staging or production.
 */
export function assertSafeTestDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Integration tests require a running MongoDB replica set."
    );
  }

  // Parse database name from URL (e.g., mongodb://host:port/database_name?opts)
  const pathname = new URL(url).pathname.replace(/^\//, "");
  const databaseName = pathname.split("?")[0].toLowerCase();

  if (
    !databaseName ||
    (!databaseName.includes("test") && !databaseName.includes("integration"))
  ) {
    throw new Error(
      `Refusing to run integration tests on database "${databaseName}". ` +
        `The database name in DATABASE_URL must contain "test" or "integration" to prevent accidental data loss.`
    );
  }
}

/**
 * Deletes documents across collections to ensure deterministic state between test suites.
 * Does not drop collections or indexes. Routed entirely through repository abstractions.
 */
export async function clearTestDatabase(): Promise<void> {
  assertSafeTestDatabaseUrl();

  await matchNotificationRepo.deleteMany({});
  await matchRepo.deleteMany({});
  await singleSwapRepo.deleteMany({});
  await bundleSwapRepo.deleteMany({});
  await cronLockRepo.deleteMany({});
  await cronExecutionRepo.deleteMany({});
  await rateLimitRepo.deleteMany({});
  await userIdentityRepo.deleteMany({});
  await userRepo.deleteMany({});
  await classRepo.deleteMany({});
  await subjectRepo.deleteMany({});
  await graphPartitionRepo.deleteMany({});
}

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}`;
}

export async function createTestUser(
  overrides: Partial<Parameters<typeof userRepo.create>[0]["data"]> = {}
) {
  const suffix = uniqueSuffix();
  return userRepo.create({
    data: {
      name: `Test User ${suffix}`,
      email: `test_user_${suffix}@example.test`,
      password: "hashed_test_password_for_integration",
      role: "USER",
      ...overrides,
    },
  });
}

export async function createTestSubject(
  overrides: Partial<Parameters<typeof subjectRepo.create>[0]["data"]> = {}
) {
  const suffix = uniqueSuffix();
  return subjectRepo.create({
    data: {
      code: `SUBJ_${suffix}`,
      name: `Subject ${suffix}`,
      year: 1,
      semester: 1,
      ...overrides,
    },
  });
}

export async function createTestClass(
  overrides: Partial<Parameters<typeof classRepo.create>[0]["data"]> = {}
) {
  const suffix = uniqueSuffix();
  return classRepo.create({
    data: {
      name: `CLS_${suffix}`,
      year: 1,
      ...overrides,
    },
  });
}

export async function seedProposedMatch() {
  const user1 = await createTestUser();
  const user2 = await createTestUser();
  const subject = await createTestSubject();
  const class1 = await createTestClass();
  const class2 = await createTestClass();

  const req1 = await singleSwapRepo.createRaw({
    data: {
      userId: user1.id,
      subjectId: subject.id,
      currentClassId: class1.id,
      preferredClassIds: [class2.id],
      ticketType: "SPECIFIC_CLASS",
      priority: 1,
      status: "MATCHED",
      graphPartition: `subject-${subject.id}`,
      preferenceOrderMatters: false,
    },
  });
  const req2 = await singleSwapRepo.createRaw({
    data: {
      userId: user2.id,
      subjectId: subject.id,
      currentClassId: class2.id,
      preferredClassIds: [class1.id],
      ticketType: "SPECIFIC_CLASS",
      priority: 1,
      status: "MATCHED",
      graphPartition: `subject-${subject.id}`,
      preferenceOrderMatters: false,
    },
  });

  await graphPartitionRepo.create({
    data: {
      partitionKey: `subject-${subject.id}`,
      ticketType: "SPECIFIC_CLASS",
      subjectId: subject.id,
      activeRequests: 0,
    },
  });

  const match = await matchRepo.create({
    data: {
      matchType: "SINGLE",
      swapPattern: "DIRECT",
      status: "PROPOSED",
      graphPartition: `subject-${subject.id}`,
      singleSwapRequestIds: [req1.id, req2.id],
      participants: [
        { userId: user1.id, requestId: req1.id, status: "pending" },
        { userId: user2.id, requestId: req2.id, status: "pending" },
      ],
    },
  });

  await singleSwapRepo.updateMany({
    where: { id: { in: [req1.id, req2.id] } },
    data: { provisionalMatchId: match.id },
  });

  return { user1, user2, subject, class1, class2, req1, req2, match };
}
