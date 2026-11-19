import { env } from "@/lib/env";

function getPostLogoutRedirectUri() {
  const app = new URL(
    env.APP_BASE_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  );
  const target = env.AUTH_POST_LOGOUT_REDIRECT_URI;
  if (target) {
    const url = new URL(target);
    if (url.origin === app.origin && !url.username && !url.password) {
      return url.href;
    }
  }
  return `${app.origin}/`;
}

export function buildZitadelLogoutUrl() {
  const returnUrl = getPostLogoutRedirectUri();
  if (!env.AUTH_ISSUER_URL || !env.AUTH_CLIENT_ID) return returnUrl;

  const issuer = new URL(env.AUTH_ISSUER_URL);
  const url = new URL("/oidc/v1/end_session", issuer.origin);
  url.searchParams.set("client_id", env.AUTH_CLIENT_ID);
  url.searchParams.set("post_logout_redirect_uri", returnUrl);
  return url.href;
}
