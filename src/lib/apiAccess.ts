import { NextRequest, NextResponse } from "next/server";

import getServerSession from "@/services/getServerSession";
import { validateOrigin } from "@/middleware/authMiddleware";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

type AuthorizationSuccess = {
  ok: true;
  authenticatedBy: "cron" | "session" | "public";
  session: SessionUser | null;
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

function isSafeMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function hasValidCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

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

  if (!requireAuth) {
    return {
      ok: true,
      authenticatedBy: "public",
      session: null,
    };
  }

  const session = await getServerSession().catch(() => null);

  if (!session) {
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
