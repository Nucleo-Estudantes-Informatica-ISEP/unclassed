// k6 environment variables are passed via --env flags or the K6_ prefix.
// Example: k6 run --env K6_BASE_URL=https://staging.example.com smoke.js
// Load, stress and spike runs send up to 100 VUs of traffic and session
// cookies to the target, so only loopback hosts are accepted by default.
// Remote targets (staging) need an explicit K6_ALLOW_REMOTE=1 opt-in.
export function resolveBaseUrl(url, allowRemote) {
  const baseUrl = url || "http://localhost:3000";
  const host = /^https?:\/\/(?:[^/@]*@)?(\[[^\]]+\]|[^/:?#]+)/i.exec(baseUrl)?.[1];
  const loopback = host && /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(host);
  if (!loopback && allowRemote !== "1") {
    throw new Error(
      `Refusing non-loopback K6_BASE_URL "${baseUrl}"; set K6_ALLOW_REMOTE=1 to confirm an isolated staging target`
    );
  }
  return baseUrl;
}

export const BASE_URL = resolveBaseUrl(
  __ENV.K6_BASE_URL,
  __ENV.K6_ALLOW_REMOTE
);
export const E2E_SECRET = __ENV.E2E_TEST_SECRET || "";

// Thresholds applied to every scenario.
// Latency thresholds are intentionally absent — establish a staging
// baseline before inventing arbitrary values.
export const THRESHOLDS = {
  // Every check() assertion must pass.
  checks: ["rate==1.0"],
  // Less than 1% of requests may fail (network errors or non-2xx).
  http_req_failed: ["rate<0.01"],
  // Zero server-side errors (5xx). Tracked via custom metric in each scenario.
  server_errors: ["rate==0"],
};
