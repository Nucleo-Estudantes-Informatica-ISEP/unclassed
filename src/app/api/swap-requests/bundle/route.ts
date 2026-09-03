import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import * as classRepo from "@/application/repositories/classRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as userService from "@/application/services/userService";
import * as requestService from "@/application/services/requestService";
import { bundleSwapRequestSchema } from "@/schemas/swapRequestSchema";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { buildPartitionKey } from "@/services/partitionKey";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";
import { toBundleSwapRequestDto } from "@/services/swapRequestDto";

const requestStatuses = ["ACTIVE", "CANCELLED"] as const;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // Build where clause
    const where: Prisma.BundleSwapRequestWhereInput = {};

    // If not admin, users can only see their own requests
    if (session.role !== "ADMIN") {
      where.userId = session.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (
      status &&
      requestStatuses.includes(status as (typeof requestStatuses)[number])
    ) {
      const validatedStatus = status as (typeof requestStatuses)[number];
      where.status = validatedStatus;
    }

    const swapRequests = await bundleSwapRequestRepo.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        currentClass: {
          select: { id: true, name: true, year: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add preferred classes info
    const swapRequestsWithClasses = await Promise.all(
      swapRequests.map(async (request) => {
        const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
        return toBundleSwapRequestDto(
          request as Parameters<typeof toBundleSwapRequestDto>[0],
          preferredClasses
        );
      })
    );

    return NextResponse.json(swapRequestsWithClasses);
  } catch (error) {
    console.error("Error fetching bundle swap requests:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
      rateLimit: "create",
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const body = await request.json();
    const validatedData = bundleSwapRequestSchema.parse({
      preferenceOrderMatters: true,
      ...body,
    });

    const validation = await requestService.validateBundleRequestCreation({
      userId: session.id,
      currentClassId: validatedData.currentClassId,
      preferredClassIds: validatedData.preferredClassIds,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { currentClass } = validation;

    const swapRequest = await bundleSwapRequestRepo.create({
      data: {
        userId: session.id,
        currentClassId: validatedData.currentClassId,
        preferredClassIds: validatedData.preferredClassIds,
        preferenceOrderMatters: validatedData.preferenceOrderMatters,
        ticketType: "ALL_CLASSES",
        priority: 1, // Default priority
        status: "ACTIVE",
        graphPartition: buildPartitionKey({
          ticketType: "ALL_CLASSES",
          year: currentClass.year,
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        currentClass: {
          select: { id: true, name: true, year: true },
        },
      },
    });

    // Add preferred classes info
    const preferredClassesInfo = await classRepo.findManyByIds(swapRequest.preferredClassIds);

    // Trigger immediate matching in the background without relying on an internal HTTP hop.
    void triggerImmediateMatching(swapRequest.id, "bundle").catch((error) => {
      console.warn("Failed to trigger immediate matching:", error);
    });

    if (session.onboardingCompletedAt === null) {
      await userService.markOnboardingComplete(session.id).catch((error) => {
        console.warn("Failed to record onboarding completion:", error);
      });
    }

    return NextResponse.json(
      {
        ...toBundleSwapRequestDto(
          swapRequest as Parameters<typeof toBundleSwapRequestDto>[0],
          preferredClassesInfo
        ),
        message:
          "Pedido de permuta completa criado! A procurar matches imediatos...",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating bundle swap request:", error);

    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: "Já tens um pedido de permuta completa ativo para esta turma",
        },
        { status: 409 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validação falhou", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
