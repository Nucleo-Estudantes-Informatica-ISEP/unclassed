import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

vi.mock("@/services/cronScheduler", () => ({
  initializeCronScheduler: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

test("importing the startup module has no auto-init side effects", async () => {
  vi.stubEnv("ENABLE_CRON_SCHEDULER", "true");
  const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

  const { isAppInitialized } = await import("./startup");

  assert.equal(setTimeoutSpy.mock.calls.length, 0);
  assert.equal(isAppInitialized(), false);
});

test("initializeApplication() is idempotent and does not schedule a startup timer", async () => {
  const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

  const { initializeApplication, isAppInitialized } = await import(
    "./startup"
  );
  const { initializeCronScheduler } = await import(
    "@/services/cronScheduler"
  );

  initializeApplication();
  initializeApplication();

  assert.equal(isAppInitialized(), true);
  assert.equal(vi.mocked(initializeCronScheduler).mock.calls.length, 1);
  assert.equal(setTimeoutSpy.mock.calls.length, 0);
});
