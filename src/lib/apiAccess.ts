import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth-nei-roles";
import getServerSession, {
  type SessionUser,
} from "@/services/getServerSession";

type SessionAuthorizationSuccess = {
  ok: true;
  authenticatedBy: "session";
  session: SessionUser;
};

type SessionlessAuthorizationSuccess = {
  ok: true;
  authenticatedBy: "cron" | "public";
  session: null;
};

type AuthorizationFailure = {
  ok: false;
  response: NextResponse;
};

type AuthorizationOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  allowCronSecret?: boolean;
  enforceSameOriginForSessionWrites?: boolean;
};

type SessionAuthorizationOptions = AuthorizationOptions & {
  requireAuth?: true;
  allowCronSecret?: false;
};

type AuthorizationSuccess =
  | SessionAuthorizationSuccess
  | SessionlessAuthorizationSuccess;

function isSafeMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function hasValidCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export function authorizeRequest(
  request: NextRequest,
  options?: SessionAuthorizationOptions
): Promise<SessionAuthorizationSuccess | AuthorizationFailure>;
export function authorizeRequest(
  request: NextRequest,
  options: AuthorizationOptions
): Promise<AuthorizationSuccess | AuthorizationFailure>;
export async function authorizeRequest(
  request: NextRequest,
  {
    requireAuth = true,
    requireAdmin = false,
    allowCronSecret = false,
    enforceSameOriginForSessionWrites = false,
  }: AuthorizationOptions = {}
): Promise<AuthorizationSuccess | AuthorizationFailure> {
  if (allowCronSecret && hasValidCronSecret(request)) {
    return {
      ok: true,
      authenticatedBy: "cron",
      session: null,
    };
  }

  const session = await getServerSession().catch(() => null);

  if (!session) {
    if (!requireAuth && !requireAdmin) {
      return {
        ok: true,
        authenticatedBy: "public",
        session: null,
      };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (requireAdmin && !isAdmin(session)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Acesso de administrador necessário" },
        { status: 403 }
      ),
    };
  }

  if (
    enforceSameOriginForSessionWrites &&
    !isSafeMethod(request.method) &&
    !validateOrigin(request)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Origem do pedido inválida" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    authenticatedBy: "session",
    session,
  };
}

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const allowedOrigins = new Set(
    [
      process.env.APP_BASE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      request.nextUrl.origin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value))
  );

  if (origin) {
    return matchesAllowedOrigin(origin, allowedOrigins);
  }

  if (referer) {
    return matchesAllowedOrigin(referer, allowedOrigins);
  }

  return true;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function matchesAllowedOrigin(
  value: string,
  allowedOrigins: Set<string>
): boolean {
  const normalizedOrigin = normalizeOrigin(value);
  return Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin));
}
