/**
 * Smoke test — 1 VU, 30 s
 *
 * Validates that the authentication stack and all critical read endpoints
 * return 200 on a live server. Intended to run automatically after every
 * staging deploy (see .github/workflows/k6-smoke.yml).
 */
import { check, sleep } from "k6";
import http from "k6/http";

import {
  createScenarioSessions,
  destroySessions,
  sessionParams,
} from "../lib/auth.js";
import { BASE_URL, THRESHOLDS } from "../lib/config.js";

import { Rate } from "k6/metrics";

const serverErrors = new Rate("server_errors");

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: THRESHOLDS,
};

export function setup() {
  return createScenarioSessions(1);
}

export default function run(data) {
  const user = data.users[(__VU - 1) % data.users.length];
  const admin = data.admins[0];

  // Unauthenticated health check
  {
    const res = http.get(`${BASE_URL}/api/health`);
    serverErrors.add(res.status >= 500);
    check(res, { "health → 200": (r) => r.status === 200 });
  }

  // Authenticated user endpoints
  {
    const res = http.get(
      `${BASE_URL}/api/dashboard/stats`,
      sessionParams(user)
    );
    serverErrors.add(res.status >= 500);
    check(res, { "dashboard/stats → 200": (r) => r.status === 200 });
  }

  {
    const res = http.get(
      `${BASE_URL}/api/swap-requests/single`,
      sessionParams(user)
    );
    serverErrors.add(res.status >= 500);
    check(res, { "swap-requests/single → 200": (r) => r.status === 200 });
  }

  {
    const res = http.get(`${BASE_URL}/api/matches`, sessionParams(user));
    serverErrors.add(res.status >= 500);
    check(res, { "matches → 200": (r) => r.status === 200 });
  }

  // Admin endpoint — read-only stats, no scheduler side-effects
  {
    const res = http.get(`${BASE_URL}/api/admin/cron`, sessionParams(admin));
    serverErrors.add(res.status >= 500);
    check(res, { "admin/cron → 200": (r) => r.status === 200 });
  }

  sleep(3 + Math.random()); // < 30 requests/minute per session on stats routes
}

export function teardown(data) {
  destroySessions([...data.users, ...data.admins]);
}
