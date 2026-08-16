import { NextRequest, NextResponse } from "next/server";

import { validateOrigin } from "@/lib/originValidation";
import getServerSession, {
  type SessionUser,
} from "@/services/getServerSession";
import {
  checkRateLimit,
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
  enforceSameOriginForSessionWrites?: boolean;
  rateLimit?: RateLimitPolicy;
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
    rateLimit,
  }: AuthorizationOptions = {}
): Promise<AuthorizationSuccess | AuthorizationFailure> {
  if (rateLimit) {
    const identifier =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rateLimitResult = await checkRateLimit(rateLimit, identifier);

    if (!rateLimitResult.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Limite de pedidos excedido",
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimitResult.retryAfter),
              "X-RateLimit-Limit": String(rateLimitResult.limit),
              "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            },
          }
        ),
      };
    }
  }

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

  if (requireAdmin && session.role !== "ADMIN") {
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
