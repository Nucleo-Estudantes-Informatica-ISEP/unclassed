import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

vi.mock("@/services/cronScheduler", () => ({
  initializeCronScheduler: vi.fn(),
}));

beforeEach(() => vi.stubGlobal("unclassedStartupComplete", undefined));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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

test("the app can report completed startup from a separate module instance", async () => {
  const { initializeApplication } = await import("./startup");
  const { initializeCronScheduler } = await import("@/services/cronScheduler");
  initializeApplication();

  vi.resetModules();
  const routeStartup = await import("./startup");
  assert.equal(routeStartup.isAppInitialized(), true);
  routeStartup.initializeApplication();
  assert.equal(vi.mocked(initializeCronScheduler).mock.calls.length, 1);
});
