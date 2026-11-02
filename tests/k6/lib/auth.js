import { check } from "k6";
import http from "k6/http";

import { BASE_URL, E2E_SECRET } from "./config.js";

// k6 skips teardown when setup throws, so this scope owns partial cleanup.
export function createScenarioSessions(count) {
  if (__ENV.K6_SESSIONS_JSON) {
    const supplied = JSON.parse(__ENV.K6_SESSIONS_JSON);
    const usedCookies = new Set();
    const result = {};
    for (const key of ["users", "admins"]) {
      if (!Array.isArray(supplied[key]) || supplied[key].length < count) {
        throw new Error(`K6_SESSIONS_JSON requires ${count} ${key} sessions`);
      }
      result[key] = supplied[key].slice(0, count).map((cookie) => {
        if (
          typeof cookie !== "string" ||
          !/^(?:__Secure-)?authjs\.session-token=[^;\s]+$/.test(cookie) ||
          usedCookies.has(cookie)
        ) {
          throw new Error(
            "K6_SESSIONS_JSON requires distinct Auth.js session cookies"
          );
        }
        usedCookies.add(cookie);
        return { cookie, owned: false };
      });
    }
    return result;
  }

  const users = [];
  const admins = [];
  try {
    createSessions(count, "USER", users);
    createSessions(count, "ADMIN", admins);
    return { users, admins };
  } catch (error) {
    destroySessions([...users, ...admins]);
    throw error;
  }
}

function createSessions(count, role, sessions) {
  if (!E2E_SECRET) {
    throw new Error(
      "Set E2E_TEST_SECRET for next dev or K6_SESSIONS_JSON for hosted staging"
    );
  }
  for (let i = 0; i < count; i++) {
    const res = http.post(
      `${BASE_URL}/api/auth/test-session?role=${role}`,
      null,
      {
        headers: { "x-e2e-secret": E2E_SECRET },
      }
    );
    const userId = res.json("userId");
    // Retain the created identity even if its cookie is missing.
    if (userId) sessions.push({ userId, owned: true });
    const secureName = "__Secure-authjs.session-token";
    const plainName = "authjs.session-token";
    const cookieName = res.cookies[secureName] ? secureName : plainName;
    const cookie = res.cookies[cookieName]?.[0]?.value;
    const valid = res.status === 200 && userId && cookie;
    check(res, {
      [`session created (${role} ${i + 1}/${count})`]: () => Boolean(valid),
    });
    if (!valid)
      throw new Error(`Test session creation failed (${role} ${i + 1})`);
    sessions[sessions.length - 1].cookie = `${cookieName}=${cookie}`;
  }
}

// Supplied hosted sessions belong to their operator and are never deleted.
export function destroySessions(sessions) {
  let failed = false;
  for (const session of sessions) {
    if (!session.owned) continue;
    try {
      const response = http.del(
        `${BASE_URL}/api/auth/test-session`,
        JSON.stringify({ userId: session.userId }),
        {
          headers: {
            "x-e2e-secret": E2E_SECRET,
            "Content-Type": "application/json",
          },
        }
      );
      failed ||= response.status !== 200;
    } catch {
      failed = true;
    }
  }
  if (failed)
    throw new Error(
      "Test-session cleanup failed; inspect the isolated test database"
    );
}

export function sessionParams(session) {
  return { headers: { Cookie: session.cookie } };
}
