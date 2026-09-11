import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth-nei-roles";
import { isDevOnlyRequestAllowed } from "@/lib/devOnly";
import { env } from "@/lib/env";
import { validateOrigin } from "@/lib/originValidation";
import getServerSession, {
  type SessionUser,
} from "@/services/getServerSession";
import {
  checkRateLimit,
  resolveRateLimitIdentifier,
  type RateLimitPolicy,
} from "@/services/rateLimit";

export { validateOrigin } from "@/lib/originValidation";

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
  devOnly?: boolean;
  enforceSameOriginForSessionWrites?: boolean;
  rateLimit?: RateLimitPolicy;
};

type SessionAuthorizationOptions = AuthorizationOptions & {
  requireAuth?: true;
  allowCronSecret?: false;
};

type AuthorizationSuccess =
  SessionAuthorizationSuccess | SessionlessAuthorizationSuccess;

function isSafeMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

async function enforceRateLimit(
  request: NextRequest,
  policy: RateLimitPolicy,
  identity: { sessionId?: string; authenticatedBy?: "cron" }
): Promise<AuthorizationFailure | null> {
  const result = await checkRateLimit(
    policy,
    resolveRateLimitIdentifier({ ...identity, headers: request.headers })
  );

  if (result.allowed) return null;

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Limite de pedidos excedido",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    ),
  };
}

export function hasValidCronSecret(request: NextRequest) {
  const cronSecret = env.CRON_SECRET;
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
    devOnly = false,
    enforceSameOriginForSessionWrites = false,
    rateLimit,
  }: AuthorizationOptions = {}
): Promise<AuthorizationSuccess | AuthorizationFailure> {
  if (!isDevOnlyRequestAllowed(devOnly, env.NODE_ENV)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não encontrado" }, { status: 404 }),
    };
  }

  if (allowCronSecret && hasValidCronSecret(request)) {
    if (rateLimit) {
      const limited = await enforceRateLimit(request, rateLimit, {
        authenticatedBy: "cron",
      });
      if (limited) return limited;
    }

    return { ok: true, authenticatedBy: "cron", session: null };
  }

  const session = await getServerSession().catch(() => null);

  if (!session) {
    if (rateLimit) {
      const limited = await enforceRateLimit(request, rateLimit, {});
      if (limited) return limited;
    }

    if (!requireAuth && !requireAdmin) {
      return { ok: true, authenticatedBy: "public", session: null };
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

  if (rateLimit) {
    const limited = await enforceRateLimit(request, rateLimit, {
      sessionId: session.id,
    });
    if (limited) return limited;
  }

  return { ok: true, authenticatedBy: "session", session };
}
