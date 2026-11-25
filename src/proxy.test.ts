import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { proxy } from "./proxy";

beforeEach(() =>
  vi.stubEnv("SEASONAL_CLOSURE_UNTIL", "2030-03-31T10:30:00+01:00")
);

const deadline = Date.parse("2030-03-31T09:30:00Z");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("serves the local reopening time throughout the closure", async () => {
  const clock = vi.spyOn(Date, "now");
  for (const now of [deadline - 86400000, deadline - 1]) {
    clock.mockReturnValue(now);
    for (const path of ["/", "/login", "/dashboard"]) {
      const response = proxy(
        new NextRequest(`https://unclassed.example.test${path}`)
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Retry-After")).toBe(
        new Date(deadline).toUTCString()
      );
      expect(await response.text()).toContain(
        '<time datetime="2030-03-31T09:30:00.000Z">'
      );
    }
  }
});

test("resumes access at the reopening time without a redirect", () => {
  vi.spyOn(Date, "now").mockReturnValue(deadline);
  const response = proxy(
    new NextRequest("https://unclassed.example.test/login")
  );
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.has("location")).toBe(false);
});

test("preserves API request IDs and health checks during the closure", () => {
  vi.spyOn(Date, "now").mockReturnValue(deadline - 1000);
  const response = proxy(
    new NextRequest("https://unclassed.example.test/api/health")
  );
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("x-request-id")).toBeTruthy();
});

test.each([undefined, "   "])(
  "serves ordinary requests when the closure value is %s",
  (value) => {
    vi.stubEnv("SEASONAL_CLOSURE_UNTIL", value);
    const response = proxy(
      new NextRequest("https://unclassed.example.test/login")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  }
);

test("fails open and warns once when the reopening time lacks a timezone", () => {
  vi.stubEnv("SEASONAL_CLOSURE_UNTIL", "2030-03-31T10:30:00");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const request = new NextRequest("https://unclassed.example.test/login");
  expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
  expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
  expect(warn).toHaveBeenCalledTimes(1);
});
