import { afterEach, expect, test, vi } from "vitest";

import { onRequestError } from "./instrumentation";

const sentry = vi.hoisted(() => ({
  captureRequestError: vi.fn(),
  setTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: sentry.captureRequestError,
  withScope: (run: (scope: { setTag: typeof sentry.setTag }) => void) =>
    run({ setTag: sentry.setTag }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("uncaught request error forwards only route and correlation metadata", () => {
  vi.stubEnv("SENTRY_DSN", "https://public@example.test/1");
  const error = new Error("private data");
  const context = {
    routerKind: "App Router",
    routePath: "/api/matches/[matchId]",
    routeType: "route",
    renderSource: "react-server-components",
  } as Parameters<typeof onRequestError>[2];

  onRequestError(
    error,
    {
      path: "/api/matches/123?email=user@example.com",
      method: "GET",
      headers: {
        "x-request-id": "a3761e30-5f12-41aa-aea3-773c345abdcd",
        authorization: "Bearer secret",
      },
    },
    context
  );

  expect(sentry.setTag).toHaveBeenCalledWith(
    "requestId",
    "a3761e30-5f12-41aa-aea3-773c345abdcd"
  );
  expect(sentry.captureRequestError).toHaveBeenCalledWith(
    error,
    { path: "/api/matches/[matchId]", method: "GET", headers: {} },
    context
  );
});
