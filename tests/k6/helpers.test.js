import { beforeEach, expect, test, vi } from "vitest";

let http;
let sleep;

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  ({ http, sleep } = await import("./mocks/k6.js"));
  globalThis.__ENV = { E2E_TEST_SECRET: "isolated-test-secret" };
  globalThis.__VU = 1;
  http.del.mockReturnValue({ status: 200 });
});

function response(id, cookieName = "authjs.session-token") {
  return {
    status: 200,
    json: () => id,
    cookies: { [cookieName]: [{ value: id }] },
  };
}

test("failed ADMIN setup removes preceding USERs and the partially created ADMIN", async () => {
  http.post.mockReturnValueOnce(response("user-1"));
  http.post.mockReturnValueOnce({
    status: 200,
    json: () => "admin-1",
    cookies: {},
  });
  const { createScenarioSessions } = await import("./lib/auth.js");
  expect(() => createScenarioSessions(1)).toThrow(
    "Test session creation failed"
  );
  expect(http.del.mock.calls.map((args) => JSON.parse(args[1]).userId)).toEqual(
    ["user-1", "admin-1"]
  );
});

test("cleanup attempts remaining users even when one deletion fails", async () => {
  http.del.mockImplementationOnce(() => {
    throw new Error("network");
  });
  const { destroySessions } = await import("./lib/auth.js");
  expect(() =>
    destroySessions([
      { userId: "a", owned: true },
      { userId: "b", owned: true },
    ])
  ).toThrow("cleanup failed");
  expect(http.del).toHaveBeenCalledTimes(2);
});

test("hosted sessions require no dev endpoint and are never deleted", async () => {
  globalThis.__ENV = {
    K6_SESSIONS_JSON: JSON.stringify({
      users: ["__Secure-authjs.session-token=user"],
      admins: ["__Secure-authjs.session-token=admin"],
    }),
  };
  const { createScenarioSessions, destroySessions } =
    await import("./lib/auth.js");
  const data = createScenarioSessions(1);
  expect(data.users[0].cookie).toBe("__Secure-authjs.session-token=user");
  destroySessions([...data.users, ...data.admins]);
  expect(http.post).not.toHaveBeenCalled();
  expect(http.del).not.toHaveBeenCalled();
});

test("rejects duplicate or insufficient hosted session pools before requests", async () => {
  globalThis.__ENV.K6_SESSIONS_JSON = JSON.stringify({
    users: ["authjs.session-token=same"],
    admins: ["authjs.session-token=same"],
  });
  const { createScenarioSessions } = await import("./lib/auth.js");
  expect(() => createScenarioSessions(1)).toThrow("distinct");
  expect(() => createScenarioSessions(2)).toThrow("requires 2");
  expect(http.post).not.toHaveBeenCalled();
});

test("local HTTPS sessions preserve secure cookie names and are owned", async () => {
  http.post.mockReturnValueOnce(
    response("user", "__Secure-authjs.session-token")
  );
  http.post.mockReturnValueOnce(
    response("admin", "__Secure-authjs.session-token")
  );
  const { createScenarioSessions } = await import("./lib/auth.js");
  const data = createScenarioSessions(1);
  expect(data.admins[0]).toEqual({
    userId: "admin",
    owned: true,
    cookie: "__Secure-authjs.session-token=admin",
  });
});

for (const scenario of ["smoke", "load", "stress", "spike"]) {
  test(`${scenario} keeps one stats request per role below 30/minute`, async () => {
    http.get.mockReturnValue({ status: 200 });
    const run = (await import(`./scenarios/${scenario}.js`)).default;
    run({
      users: [{ cookie: "authjs.session-token=user" }],
      admins: [{ cookie: "authjs.session-token=admin" }],
    });
    const wait = sleep.mock.calls[0][0];
    expect(wait).toBeGreaterThanOrEqual(3);
    expect(
      http.get.mock.calls.filter(([url]) =>
        url.endsWith("/api/dashboard/stats")
      )
    ).toHaveLength(1);
    expect(
      http.get.mock.calls.filter(([url]) => url.endsWith("/api/admin/cron"))
    ).toHaveLength(1);
    expect(Math.ceil(60 / wait)).toBeLessThan(30);
  });
}
