import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest, type AuthorizationOptions } from "@/lib/apiAccess";
import type { SessionUser } from "@/services/getServerSession";

type AuthPolicy = AuthorizationOptions | false;
type Params = Record<string, string | string[]>;
type MaybePromise<T> = T | Promise<T>;
type Identity<A> = A extends false
  ? { session: null; authenticatedBy: "public" }
  : A extends { allowCronSecret: true } | { requireAuth: false }
    ? {
        session: SessionUser | null;
        authenticatedBy: "session" | "cron" | "public";
      }
    : { session: SessionUser; authenticatedBy: "session" };

type HandlerContext<A, B, P> = Identity<A> & {
  request: NextRequest;
  body: B;
  params: P;
};

type HandlerOptions<A, B, P> = {
  // false is for public endpoints and protocol handlers that own authentication.
  auth?: A;
  schema?: z.ZodType<B>;
  authorize?: (
    context: HandlerContext<A, B, P>
  ) => MaybePromise<Response | void>;
  handler: (context: HandlerContext<A, B, P>) => MaybePromise<Response>;
  errorMessage?: string;
  onError?: (error: unknown) => MaybePromise<Response | undefined>;
};

export function defineHandler<
  const A extends AuthPolicy = AuthorizationOptions & {
    requireAuth?: true;
    allowCronSecret?: false;
  },
  B = undefined,
  P extends Params = Params,
>({
  auth,
  schema,
  authorize,
  handler,
  onError,
  errorMessage = "Erro interno do servidor",
}: HandlerOptions<A, B, P>) {
  return async (
    request: NextRequest,
    route?: { params: Promise<P> }
  ): Promise<Response> => {
    try {
      const identity =
        auth === false
          ? { session: null, authenticatedBy: "public" as const }
          : await authorizeRequest(request, {
              enforceSameOriginForSessionWrites: true,
              ...auth,
            });
      if ("ok" in identity && !identity.ok) return identity.response;

      let body: B | undefined;
      if (schema) {
        let input: unknown;
        try {
          input = await request.json();
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
        }
        body = await schema.parseAsync(input);
      }
      const context = {
        ...identity,
        request,
        body,
        params: route ? await route.params : {},
      } as unknown as HandlerContext<A, B, P>;
      const denied = await authorize?.(context);
      if (denied) return denied;
      return await handler(context);
    } catch (error) {
      const mapped = await onError?.(error);
      if (mapped) return mapped;
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validação falhou", details: error.issues },
          { status: 400 }
        );
      }
      console.error("HTTP handler failed:", error);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  };
}
