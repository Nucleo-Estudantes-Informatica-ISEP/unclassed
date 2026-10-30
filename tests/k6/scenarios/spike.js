/**
 * Spike test — 5 VUs baseline → burst 100 VUs for 30 s → back to 5 VUs
 *
 * Tests elasticity under sudden traffic bursts (e.g. a news mention or
 * scheduled notification email that sends all at once). Run manually
 * against staging only — never automated against production.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { BASE_URL, THRESHOLDS } from "../lib/config.js";
import { createSessions, destroySessions, sessionParams } from "../lib/auth.js";

const serverErrors = new Rate("server_errors");

const MAX_VUS = 100;

export const options = {
  stages: [
    { duration: "1m", target: 5 },       // baseline
    { duration: "30s", target: MAX_VUS }, // spike
    { duration: "1m", target: 5 },        // recover
    { duration: "30s", target: 0 },       // ramp down
  ],
  thresholds: THRESHOLDS,
};

export function setup() {
  return {
    users: createSessions(MAX_VUS, "USER"),
    admins: createSessions(MAX_VUS, "ADMIN"),
  };
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
    const res = http.get(`${BASE_URL}/api/dashboard/stats`, sessionParams(user));
    serverErrors.add(res.status >= 500);
    check(res, { "dashboard/stats → 200": (r) => r.status === 200 });
  }

  {
    const res = http.get(`${BASE_URL}/api/swap-requests/single`, sessionParams(user));
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

  sleep(Math.random() + 0.5); // 0.5–1.5 s — tighter think time during spike
}

export function teardown(data) {
  destroySessions([...data.users, ...data.admins]);
}
