import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { defineHandler } from "@/lib/defineHandler";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import {
  cancelSwapRequest,
  createBundleSwapRequest,
  createSingleSwapRequest,
  deleteSwapRequest,
  getSwapRequestById,
  listSwapRequests,
  SwapRequestConflictError,
  SwapRequestError,
  SwapRequestForbiddenError,
  SwapRequestNotFoundError,
  SwapRequestValidationError,
  updateSwapRequestPreferredClasses,
} from "@/application/services/swapRequestService";
import {
  bundleSwapRequestSchema,
  singleSwapRequestSchema,
  updateSwapRequestSchema,
} from "@/schemas/swapRequestSchema";

export type SwapType = "single" | "bundle";

export type RouteContext = {
  params: Promise<{ id: string }>;
};

function getRepository(type: SwapType) {
  return type === "single" ? singleSwapRequestRepo : bundleSwapRequestRepo;
}

/**
 * Maps swap request errors to HTTP status codes
 */
function mapSwapRequestErrorToHttpStatus(error: SwapRequestError): number {
  if (error instanceof SwapRequestNotFoundError) return 404;
  if (error instanceof SwapRequestForbiddenError) return 403;
  if (error instanceof SwapRequestValidationError) return 400;
  if (error instanceof SwapRequestConflictError) return 409;

  return 500; // default for unknown business errors
}

/**
 * Maps service errors and exceptions to structured HTTP responses.
 */
function handleRouteError(error: unknown, contextDescription: string) {
  if (error instanceof SwapRequestError) {
    const status = mapSwapRequestErrorToHttpStatus(error);
    if (status === 500) {
      console.error(
        `Unhandled swap request error in ${contextDescription}:`,
        error
      );
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    const body: { error: string; details?: unknown } = {
      error: error.message,
    };

    if (
      error instanceof SwapRequestValidationError &&
      error.details !== undefined
    ) {
      body.details = error.details;
    }

    return NextResponse.json(body, { status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validação falhou", details: error.issues },
      { status: 400 }
    );
  }

  console.error(`Error in ${contextDescription}:`, error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
}

// Defaulting belongs to the HTTP contract; the form schemas stay strict.
const singleCreateSchema = singleSwapRequestSchema.extend({
  preferenceOrderMatters: z.boolean().default(true),
});
const bundleCreateSchema = bundleSwapRequestSchema.extend({
  preferenceOrderMatters: z.boolean().default(true),
});

export function createSwapRequestHandlers(type: SwapType) {
  const repo = getRepository(type);
  return {
    list: defineHandler({
      onError: (error) =>
        handleRouteError(error, `fetching ${type} swap requests`),
      handler: async ({ request, session }) => {
        const query = request.nextUrl.searchParams;
        return NextResponse.json(
          await listSwapRequests({
            session,
            queryUserId: query.get("userId"),
            queryStatus: query.get("status"),
            repo,
          })
        );
      },
    }),
    create:
      type === "single"
        ? defineHandler({
            auth: { rateLimit: "create" },
            schema: singleCreateSchema,
            onError: (error) =>
              handleRouteError(error, "creating single swap request"),
            handler: async ({ session, body }) =>
              NextResponse.json(
                {
                  ...(await createSingleSwapRequest(
                    session,
                    body,
                    singleSwapRequestRepo
                  )),
                  message:
                    "Pedido criado com sucesso! A procurar matches imediatos...",
                },
                { status: 201 }
              ),
          })
        : defineHandler({
            auth: { rateLimit: "create" },
            schema: bundleCreateSchema,
            onError: (error) =>
              handleRouteError(error, "creating bundle swap request"),
            handler: async ({ session, body }) =>
              NextResponse.json(
                {
                  ...(await createBundleSwapRequest(
                    session,
                    body,
                    bundleSwapRequestRepo
                  )),
                  message:
                    "Pedido de permuta completa criado! A procurar matches imediatos...",
                },
                { status: 201 }
              ),
          }),
    get: defineHandler({
      onError: (error) =>
        handleRouteError(error, `fetching ${type} swap request by id`),
      handler: async ({ session, params }) =>
        NextResponse.json(
          await getSwapRequestById(session, params.id as string, repo)
        ),
    }),
    update: defineHandler({
      schema: updateSwapRequestSchema,
      onError: (error) =>
        handleRouteError(error, `updating ${type} swap request`),
      handler: async ({ session, params, body }) => {
        const id = params.id as string;
        if (body.status === "CANCELLED") {
          return NextResponse.json(await cancelSwapRequest(session, id, repo));
        }
        if (body.preferredClassIds !== undefined) {
          return NextResponse.json(
            await updateSwapRequestPreferredClasses(
              session,
              id,
              type,
              repo,
              body.preferredClassIds
            )
          );
        }
        throw new SwapRequestValidationError("Input inválido para atualização");
      },
    }),
    delete: defineHandler({
      onError: (error) =>
        handleRouteError(error, `deleting ${type} swap request`),
      handler: async ({ session, params }) => {
        await deleteSwapRequest(session, params.id as string, repo);
        return NextResponse.json({
          message:
            type === "single"
              ? "Pedido de permuta eliminado com sucesso"
              : "Pedido de permuta completa eliminado com sucesso",
        });
      },
    }),
  };
}

const handlers = {
  single: createSwapRequestHandlers("single"),
  bundle: createSwapRequestHandlers("bundle"),
};
export const handleGetSwapRequests = (request: NextRequest, type: SwapType) =>
  handlers[type].list(request);
export const handleCreateSwapRequest = (request: NextRequest, type: SwapType) =>
  handlers[type].create(request);
export const handleGetSwapRequestById = (
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) => handlers[type].get(request, context);
export const handleUpdateSwapRequest = (
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) => handlers[type].update(request, context);
export const handleDeleteSwapRequest = (
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) => handlers[type].delete(request, context);
