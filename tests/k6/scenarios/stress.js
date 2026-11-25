/**
 * Stress test — ramp 0 → 10 → 25 → 50 VUs across ~13 min
 *
 * Pushes beyond expected load to find where latency degrades or errors
 * appear. Use p95 latency output to establish staging latency thresholds
 * rather than guessing. Run manually against staging only.
 *
 * POST /api/admin/cron (trigger actions) is intentionally excluded —
 * it runs the matching engine and is not safe to hammer under load.
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

const MAX_VUS = 50;

export const options = {
  stages: [
    { duration: "2m", target: 10 }, // warm up
    { duration: "3m", target: 10 }, // hold at low load
    { duration: "3m", target: 25 }, // ramp to medium
    { duration: "3m", target: MAX_VUS }, // ramp to peak
    { duration: "2m", target: 0 }, // ramp down
  ],
  thresholds: THRESHOLDS,
};

export function setup() {
  return createScenarioSessions(MAX_VUS);
}

export default function run(data) {
  const user = data.users[(__VU - 1) % data.users.length];
  const admin = data.admins[(__VU - 1) % data.admins.length];

  {
    const res = http.get(`${BASE_URL}/api/health`);
    serverErrors.add(res.status >= 500);
    check(res, { "health → 200": (r) => r.status === 200 });
  }

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
