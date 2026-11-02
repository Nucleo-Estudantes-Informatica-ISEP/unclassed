
/**
 * @vitest-environment happy-dom
 */

import assert from "node:assert/strict";
import { act, createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, test, vi } from "vitest";

import { RefreshButton } from "./RefreshButton";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  refresh.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  refresh.mockClear();
});

test("automatic refresh pauses while hidden and resumes on return", async () => {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  let visible = true;

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (visible ? "visible" : "hidden"),
  });

  try {
    await act(async () => {
      root.render(
        createElement(
          RefreshButton as ComponentType<{
            initialAutoRefresh: boolean;
          }>,
          { initialAutoRefresh: true },
        ),
      );
    });

    visible = false;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    assert.equal(refresh.mock.calls.length, 0);

    visible = true;

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    assert.equal(refresh.mock.calls.length, 1);
  } finally {
    await act(async () => {
      root.unmount();
    });

    container.remove();
  }
});

test("automatic refresh runs when countdown reaches zero", async () => {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });

  try {
    await act(async () => {
      root.render(
        createElement(
          RefreshButton as ComponentType<{
            initialAutoRefresh: boolean;
            autoRefreshInterval: number;
          }>,
          {
            initialAutoRefresh: true,
            autoRefreshInterval: 3,
          },
        ),
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    assert.equal(refresh.mock.calls.length, 0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    assert.equal(refresh.mock.calls.length, 1);

    // Allow the refresh loading delay to finish.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    assert.equal(refresh.mock.calls.length, 1);
  } finally {
    await act(async () => {
      root.unmount();
    });

    container.remove();
  }
});
