// k6 environment variables are passed via --env flags or the K6_ prefix.
// Example: k6 run --env K6_BASE_URL=https://staging.example.com smoke.js
export const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";
export const E2E_SECRET = __ENV.E2E_TEST_SECRET || "";

// Thresholds applied to every scenario.
// Latency thresholds are intentionally absent — establish a staging
// baseline before inventing arbitrary values.
export const THRESHOLDS = {
  // Less than 1% of requests may fail (network errors or non-2xx).
  http_req_failed: ["rate<0.01"],
  // Zero server-side errors (5xx). Tracked via custom metric in each scenario.
  server_errors: ["rate==0"],
};
