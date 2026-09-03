import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import * as classRepo from "@/application/repositories/classRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as userService from "@/application/services/userService";
import * as requestService from "@/application/services/requestService";
import { singleSwapRequestSchema } from "@/schemas/swapRequestSchema";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { buildPartitionKey } from "@/services/partitionKey";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";
import { toSingleSwapRequestDto } from "@/services/swapRequestDto";

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
    const where: Prisma.SingleSwapRequestWhereInput = {};

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

    const swapRequests = await singleSwapRequestRepo.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        subject: {
          select: { id: true, code: true, name: true, year: true },
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
        return toSingleSwapRequestDto(
          request as Parameters<typeof toSingleSwapRequestDto>[0],
          preferredClasses
        );
      })
    );

    return NextResponse.json(swapRequestsWithClasses);
  } catch (error) {
    console.error("Error fetching single swap requests:", error);
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
    const validatedData = singleSwapRequestSchema.parse({
      preferenceOrderMatters: true,
      ...body,
    });

    const validation = await requestService.validateSingleRequestCreation({
      userId: session.id,
      subjectId: validatedData.subjectId,
      currentClassId: validatedData.currentClassId,
      preferredClassIds: validatedData.preferredClassIds,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const swapRequest = await singleSwapRequestRepo.create({
      data: {
        userId: session.id,
        subjectId: validatedData.subjectId,
        currentClassId: validatedData.currentClassId,
        preferredClassIds: validatedData.preferredClassIds,
        preferenceOrderMatters: validatedData.preferenceOrderMatters,
        ticketType: "SPECIFIC_CLASS",
        priority: 1, // Default priority
        status: "ACTIVE",
        graphPartition: buildPartitionKey({
          ticketType: "SPECIFIC_CLASS",
          subjectId: validatedData.subjectId,
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        subject: {
          select: { id: true, code: true, name: true, year: true },
        },
        currentClass: {
          select: { id: true, name: true, year: true },
        },
      },
    });

    // Add preferred classes info
    const preferredClassesInfo = await classRepo.findManyByIds(swapRequest.preferredClassIds);

    // Trigger immediate matching in the background without relying on an internal HTTP hop.
    void triggerImmediateMatching(swapRequest.id, "single").catch((error) => {
      console.warn("Failed to trigger immediate matching:", error);
    });

    if (session.onboardingCompletedAt === null) {
      await userService.markOnboardingComplete(session.id).catch((error) => {
        console.warn("Failed to record onboarding completion:", error);
      });
    }

    return NextResponse.json(
      {
        ...toSingleSwapRequestDto(
          swapRequest as Parameters<typeof toSingleSwapRequestDto>[0],
          preferredClassesInfo
        ),
        message: "Pedido criado com sucesso! A procurar matches imediatos...",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating single swap request:", error);

    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já tens um pedido ativo para esta disciplina" },
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
