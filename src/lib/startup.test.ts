import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

vi.mock("@/services/cronScheduler", () => ({
  initializeCronScheduler: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

test("importing the startup module has no auto-init side effects", async () => {
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

  initializeApplication();
  initializeApplication();

  assert.equal(isAppInitialized(), true);
  assert.equal(setTimeoutSpy.mock.calls.length, 0);
});
