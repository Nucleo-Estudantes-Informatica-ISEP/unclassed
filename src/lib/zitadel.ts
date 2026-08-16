import { env } from "@/lib/env";

const DEFAULT_APP_URL = "http://localhost:3000";

type OidcMetadata = {
  end_session_endpoint?: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAppBaseUrl() {
  return trimTrailingSlash(
    env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  );
}

export function getPostLogoutRedirectUri() {
  return env.AUTH_POST_LOGOUT_REDIRECT_URI || `${getAppBaseUrl()}/`;
}

export function getIssuerUrl() {
  const issuer = env.AUTH_ISSUER_URL;

  if (!issuer) {
    throw new Error("AUTH_ISSUER_URL is not configured.");
  }

  return trimTrailingSlash(issuer);
}

export function getAuthClientId() {
  return env.AUTH_CLIENT_ID || null;
}

async function getOidcMetadata(): Promise<OidcMetadata> {
  const issuer = getIssuerUrl();
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OIDC discovery metadata.");
  }

  return (await response.json()) as OidcMetadata;
}

export async function buildZitadelLogoutUrl(
  idTokenHint?: string | null,
  logoutHint?: string | null
) {
  const issuer = getIssuerUrl();
  const metadata: OidcMetadata = await getOidcMetadata().catch(
    () => ({}) as OidcMetadata
  );
  const endSessionEndpoint =
    metadata.end_session_endpoint || `${issuer}/oidc/v1/end_session`;

  const url = new URL(endSessionEndpoint);
  url.searchParams.set("post_logout_redirect_uri", getPostLogoutRedirectUri());

  const clientId = getAuthClientId();
  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }

  url.searchParams.set("state", crypto.randomUUID());

  if (idTokenHint) {
    url.searchParams.set("id_token_hint", idTokenHint);
  }

  if (logoutHint) {
    url.searchParams.set("logout_hint", logoutHint);
  }

  return url.toString();
}

export async function buildLogoutCallbackPath(
  idTokenHint?: string | null,
  logoutHint?: string | null
) {
  const target = await buildZitadelLogoutUrl(idTokenHint, logoutHint);
  return `/api/logout/callback?target=${encodeURIComponent(target)}`;
}

export function resolveSafeLogoutTarget(target?: string | null) {
  if (!target) {
    return getPostLogoutRedirectUri();
  }

  try {
    const resolvedTarget = new URL(target);
    const issuerUrl = env.AUTH_ISSUER_URL;

    if (!issuerUrl) {
      return getPostLogoutRedirectUri();
    }

    const issuerOrigin = new URL(trimTrailingSlash(issuerUrl)).origin;

    if (resolvedTarget.origin !== issuerOrigin) {
      return getPostLogoutRedirectUri();
    }

    return resolvedTarget.toString();
  } catch {
    return getPostLogoutRedirectUri();
  }
}
