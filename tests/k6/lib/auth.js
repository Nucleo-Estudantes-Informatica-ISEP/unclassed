import http from "k6/http";
import { check } from "k6";
import { BASE_URL, E2E_SECRET } from "./config.js";

// Creates `count` authenticated sessions for the given role via the
// test-session endpoint from #171. Each session object holds the userId
// (needed for teardown) and the raw cookie string ready to include in
// request headers.
export function createSessions(count, role = "USER") {
  if (!E2E_SECRET) {
    throw new Error("E2E_TEST_SECRET is not set — cannot create test sessions");
  }

  const sessions = [];
  for (let i = 0; i < count; i++) {
    const res = http.post(
      `${BASE_URL}/api/auth/test-session?role=${role}`,
      null,
      { headers: { "x-e2e-secret": E2E_SECRET } }
    );

    check(res, {
      [`session created (${role} ${i + 1}/${count})`]: (r) => r.status === 200,
    });

    // Auth.js sets __Secure-authjs.session-token over HTTPS and
    // authjs.session-token over HTTP (localhost). Check secure name first.
    const secureName = "__Secure-authjs.session-token";
    const plainName = "authjs.session-token";
    const cookieName = res.cookies[secureName] ? secureName : plainName;
    const jar = res.cookies[cookieName];
    if (!jar || !jar[0]) {
      throw new Error(
        `No session cookie in test-session response (${role} ${i + 1})`
      );
    }

    sessions.push({
      userId: res.json("userId"),
      cookie: `${cookieName}=${jar[0].value}`,
    });
  }
  return sessions;
}

// Deletes every test user created by createSessions. Call in teardown().
export function destroySessions(sessions) {
  for (const s of sessions) {
    http.del(
      `${BASE_URL}/api/auth/test-session`,
      JSON.stringify({ userId: s.userId }),
      {
        headers: {
          "x-e2e-secret": E2E_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// Returns a k6 params object that injects the session cookie into a request.
export function sessionParams(session) {
  return { headers: { Cookie: session.cookie } };
}
