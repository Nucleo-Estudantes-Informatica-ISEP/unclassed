// @vitest-environment happy-dom

import assert from "node:assert/strict";
import { act, createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { test, vi } from "vitest";

import { RefreshButton } from "./RefreshButton";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

test("automatic refresh pauses while hidden and resumes on return", async () => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let visible = true;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (visible ? "visible" : "hidden"),
  });

  try {
    await act(async () =>
      root.render(
        createElement(
          RefreshButton as ComponentType<{ initialAutoRefresh: boolean }>,
          { initialAutoRefresh: true }
        )
      )
    );
    visible = false;
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    assert.equal(refresh.mock.calls.length, 0);

    visible = true;
    await act(async () =>
      document.dispatchEvent(new Event("visibilitychange"))
    );
    assert.equal(refresh.mock.calls.length, 1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    refresh.mockClear();
  }
});
