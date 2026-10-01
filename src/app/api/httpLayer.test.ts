import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { findUnique } from "@/application/repositories/matchRepository";
import getServerSession from "@/services/getServerSession";
import { checkRateLimit } from "@/services/rateLimit";

import * as cron from "./admin/cron/route";
import { GET as classes } from "./classes/route";
import { GET as stats } from "./dashboard/stats/route";
import * as match from "./matches/[matchId]/route";
import { GET as matches } from "./matches/route";
import * as matching from "./matching/route";
import { GET as subjects } from "./subjects/route";
import * as bundleItem from "./swap-requests/bundle/[id]/route";
import * as bundle from "./swap-requests/bundle/route";
import * as singleItem from "./swap-requests/single/[id]/route";
import * as single from "./swap-requests/single/route";
import { POST as testMatches } from "./test-matches/route.dev";
import * as preferences from "./user/preferences/route";

vi.mock("@/services/getServerSession", () => ({ default: vi.fn() }));
vi.mock("@/services/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  resolveRateLimitIdentifier: vi.fn().mockReturnValue("test"),
}));
vi.mock("@/lib/env", () => ({
  env: { NODE_ENV: "test", CRON_SECRET: "test-secret" },
}));
vi.mock("@/application/matchingOrchestrator", () => ({
  MatchingOrchestrator: class {
    getAdvancedStats = vi.fn().mockResolvedValue({ activePartitions: 2 });
  },
}));
vi.mock("@/application/repositories/userRepository", () => ({
  findPreferencesById: vi
    .fn()
    .mockResolvedValue({
      phone: null,
      emailNotifications: true,
      sharePhoneOnMatch: false,
    }),
  updatePreferences: vi.fn().mockImplementation((_id, value) => value),
}));
vi.mock("@/application/repositories/matchRepository", () => ({ findUnique: vi.fn() }));
vi.mock("@/lib/startup", () => ({ isAppInitialized: () => false }));

const user = {
  id: "user-1",
  email: "user@example.test",
  role: "USER",
  roles: [],
};
const admin = { ...user, role: "ADMIN", roles: ["admin"] };
beforeEach(() => {
  vi.mocked(getServerSession).mockReset();
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never);
});
const req = (method = "GET", body?: string, headers?: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/test", { method, body, headers });
const item = { params: Promise.resolve({ id: "item", matchId: "match" }) };

const protectedRoutes = [
  ["classes GET", classes],
  ["subjects GET", subjects],
  ["stats GET", stats],
  ["matching GET", matching.GET],
  ["matching POST", matching.POST],
  ["matching PUT", matching.PUT],
  ["cron GET", cron.GET],
  ["cron POST", cron.POST],
  ["preferences GET", preferences.GET],
  ["preferences PATCH", preferences.PATCH],
  ["matches GET", matches],
  ["match GET", match.GET],
  ["match PATCH", match.PATCH],
  ["single GET", single.GET],
  ["single POST", single.POST],
  ["single item GET", singleItem.GET],
  ["single item PUT", singleItem.PUT],
  ["single item DELETE", singleItem.DELETE],
  ["bundle GET", bundle.GET],
  ["bundle POST", bundle.POST],
  ["bundle item GET", bundleItem.GET],
  ["bundle item PUT", bundleItem.PUT],
  ["bundle item DELETE", bundleItem.DELETE],
] as const;

test.each(protectedRoutes)(
  "%s rejects missing sessions before touching services",
  async (_name, route) => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await route(req(), item)).status).toBe(401);
  }
);

test.each([matching.GET, matching.POST, matching.PUT, cron.GET, cron.POST])(
  "admin endpoint rejects ordinary users",
  async (route) => {
    vi.mocked(getServerSession).mockResolvedValue(user as never);
    expect((await route(req(), item)).status).toBe(403);
  }
);

test("cron bearer is accepted only on matching, not admin cron controls", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  const response = await matching.GET(
    req("GET", undefined, { authorization: "Bearer test-secret" })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    requestedBy: "cron",
    activePartitions: 2,
  });
  expect(
    (
      await cron.GET(
        req("GET", undefined, { authorization: "Bearer test-secret" })
      )
    ).status
  ).toBe(401);
});

test.each([
  preferences.PATCH,
  single.POST,
  singleItem.PUT,
  singleItem.DELETE,
  bundle.POST,
  bundleItem.PUT,
  bundleItem.DELETE,
  match.PATCH,
  matching.POST,
  matching.PUT,
  cron.POST,
])(
  "session write rejects cross-origin requests before parsing",
  async (route) => {
    vi.mocked(getServerSession).mockResolvedValue(admin as never);
    expect(
      (await route(req("POST", "{", { origin: "https://other.example" }), item))
        .status
    ).toBe(403);
  }
);

test("rate limits preserve retry metadata", async () => {
  vi.mocked(getServerSession).mockResolvedValue(admin as never);
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: false,
    retryAfter: 15,
    limit: 10,
    remaining: 0,
  } as never);
  const response = await matching.GET(req());
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("15");
  expect(await response.json()).toMatchObject({ retryAfter: 15 });
});

test("preferences preserve successful and domain validation responses", async () => {
  vi.mocked(getServerSession).mockResolvedValue(user as never);
  const saved = await preferences.PATCH(req("PATCH", '{"phone":"912345678"}'));
  expect(saved.status).toBe(200);
  expect(await saved.json()).toMatchObject({ user: { phone: "912345678" } });
  const invalid = await preferences.PATCH(req("PATCH", '{"phone":"invalid"}'));
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({
    error: "Número de telemóvel inválido",
  });
  expect((await preferences.PATCH(req("PATCH", "{"))).status).toBe(400);
});

test("development-only destructive route remains unavailable outside development", async () => {
  vi.mocked(getServerSession).mockResolvedValue(admin as never);
  expect((await testMatches(req("POST"))).status).toBe(404);
  expect(getServerSession).not.toHaveBeenCalled();
});


test("match routes preserve missing-resource, ownership and action validation errors", async () => {
  vi.mocked(getServerSession).mockResolvedValue(user as never);
  vi.mocked(findUnique).mockResolvedValueOnce(null);
  expect((await match.GET(req(), item)).status).toBe(404);
  vi.mocked(findUnique).mockResolvedValueOnce({ id: "match", participants: [{ userId: "other-user" }] } as never);
  expect((await match.PATCH(req("PATCH", '{"action":"accept"}'), item)).status).toBe(403);
  const invalid = await match.PATCH(req("PATCH", '{"action":"unknown"}'), item);
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: "Ação inválida" });
});
