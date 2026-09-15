import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { 
  updateSwapRequestSchema,
  singleSwapRequestSchema,
  bundleSwapRequestSchema
} from "@/schemas/swapRequestSchema";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";

import { authorizeRequest } from "@/lib/apiAccess";
import {
  SwapRequestError,
  SwapRequestNotFoundError,
  SwapRequestForbiddenError,
  SwapRequestValidationError,
  SwapRequestConflictError,
  listSwapRequests,
  getSwapRequestById,
  createSingleSwapRequest,
  createBundleSwapRequest,
  updateSwapRequestPreferredClasses,
  cancelSwapRequest,
  deleteSwapRequest,
} from "@/application/services/swapRequestService";

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
      console.error(`Unhandled swap request error in ${contextDescription}:`, error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    const body: { error: string; details?: unknown } = {
      error: error.message,
    };
    
    if (error instanceof SwapRequestValidationError && error.details !== undefined) {
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

export async function handleGetSwapRequests(
  request: NextRequest,
  type: SwapType
) {
  try {
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) return authResult.response;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    const requests = await listSwapRequests({
      session,
      queryUserId: userId,
      queryStatus: status,
      repo: getRepository(type),
    });

    return NextResponse.json(requests);
  } catch (error) {
    return handleRouteError(error, `fetching ${type} swap requests`);
  }
}

export async function handleCreateSwapRequest(
  request: NextRequest,
  type: SwapType
) {
  try {
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
      rateLimit: "create",
    });
    if (!authResult.ok) return authResult.response;
    const { session } = authResult;

    const rawBody = await request.json();
    if (rawBody && typeof rawBody === "object" && rawBody.preferenceOrderMatters === undefined) {
      rawBody.preferenceOrderMatters = true;
    }

    if (type === "single") {
      const body = singleSwapRequestSchema.parse(rawBody);
      const result = await createSingleSwapRequest(session, body, singleSwapRequestRepo);
      return NextResponse.json(
        {
          ...result,
          message: "Pedido criado com sucesso! A procurar matches imediatos...",
        },
        { status: 201 }
      );
    } else {
      const body = bundleSwapRequestSchema.parse(rawBody);
      const result = await createBundleSwapRequest(session, body, bundleSwapRequestRepo);
      return NextResponse.json(
        {
          ...result,
          message: "Pedido de permuta completa criado! A procurar matches imediatos...",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    return handleRouteError(error, `creating ${type} swap request`);
  }
}

export async function handleGetSwapRequestById(
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) {
  try {
    const { id } = await context.params;
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) return authResult.response;
    const { session } = authResult;

    const dto = await getSwapRequestById(session, id, getRepository(type));
    return NextResponse.json(dto);
  } catch (error) {
    return handleRouteError(error, `fetching ${type} swap request by id`);
  }
}

export async function handleUpdateSwapRequest(
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) {
  try {
    const { id } = await context.params;
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) return authResult.response;
    const { session } = authResult;

    const body = await request.json();
    const validatedBody = updateSwapRequestSchema.parse(body);
    
    if (validatedBody.status === "CANCELLED") {
      const result = await cancelSwapRequest(session, id, getRepository(type));
      return NextResponse.json(result);
    }
    
    if (validatedBody.preferredClassIds !== undefined) {
      const result = await updateSwapRequestPreferredClasses(session, id, type, getRepository(type), validatedBody.preferredClassIds);
      return NextResponse.json(result);
    }

    throw new SwapRequestValidationError("Input inválido para atualização");
  } catch (error) {
    return handleRouteError(error, `updating ${type} swap request`);
  }
}

export async function handleDeleteSwapRequest(
  request: NextRequest,
  context: RouteContext,
  type: SwapType
) {
  try {
    const { id } = await context.params;
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) return authResult.response;
    const { session } = authResult;

    await deleteSwapRequest(session, id, getRepository(type));
    return NextResponse.json({ 
      message: type === "single"
        ? "Pedido de permuta eliminado com sucesso"
        : "Pedido de permuta completa eliminado com sucesso"
    });
  } catch (error) {
    return handleRouteError(error, `deleting ${type} swap request`);
  }
}
