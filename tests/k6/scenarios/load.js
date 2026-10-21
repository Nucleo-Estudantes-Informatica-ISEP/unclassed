/**
 * Average-load test — ramp 0 → 15 VUs over 1 min, hold 3 min, ramp down 1 min
 *
 * Simulates expected concurrent traffic on staging.
 * Adjust MAX_VUS via --env K6_MAX_VUS if the staging baseline differs.
 * Run manually or as part of release validation — not wired to CI.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { BASE_URL, THRESHOLDS } from "../lib/config.js";
import { createSessions, destroySessions, sessionParams } from "../lib/auth.js";

const serverErrors = new Rate("server_errors");

const MAX_VUS = parseInt(__ENV.K6_MAX_VUS || "15", 10);

export const options = {
  stages: [
    { duration: "1m", target: MAX_VUS }, // ramp up
    { duration: "3m", target: MAX_VUS }, // sustain
    { duration: "1m", target: 0 },       // ramp down
  ],
  thresholds: THRESHOLDS,
};

export function setup() {
  return {
    users: createSessions(MAX_VUS, "USER"),
    admin: createSessions(1, "ADMIN")[0],
  };
}

export default function run(data) {
  const user = data.users[(__VU - 1) % data.users.length];
  const admin = data.admin;

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

  // Simulate realistic think time between page interactions
  sleep(Math.random() * 2 + 1); // 1–3 s
}

export function teardown(data) {
  destroySessions([...data.users, data.admin]);
}
