import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import prisma from "@/lib/prisma";
import { singleSwapRequestSchema } from "@/schemas/swapRequestSchema";
import { hasBlockingAcceptedMatch } from "@/services/matchParticipation";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { buildPartitionKey } from "@/services/partitionKey";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";

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

    const swapRequests = await prisma.singleSwapRequest.findMany({
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
        const preferredClasses = await prisma.class.findMany({
          where: { id: { in: request.preferredClassIds } },
          select: { id: true, name: true, year: true },
        });
        return { ...request, preferredClasses };
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

    // Verify the subject and classes exist
    const [subject, currentClass, preferredClasses] = await Promise.all([
      prisma.subject.findUnique({ where: { id: validatedData.subjectId } }),
      prisma.class.findUnique({ where: { id: validatedData.currentClassId } }),
      prisma.class.findMany({
        where: { id: { in: validatedData.preferredClassIds } },
      }),
    ]);

    if (!subject) {
      return NextResponse.json(
        { error: "Disciplina não encontrada" },
        { status: 404 }
      );
    }

    if (!currentClass) {
      return NextResponse.json(
        { error: "Turma atual não encontrada" },
        { status: 404 }
      );
    }

    if (preferredClasses.length !== validatedData.preferredClassIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais turmas preferidas não foram encontradas" },
        { status: 404 }
      );
    }

    // Check if user already has an active request for this subject
    const existingRequest = await prisma.singleSwapRequest.findFirst({
      where: {
        userId: session.id,
        subjectId: validatedData.subjectId,
        status: "ACTIVE",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Já tens um pedido ativo para esta disciplina" },
        { status: 409 }
      );
    }

    const userHasAcceptedMatch = await hasBlockingAcceptedMatch(session.id);

    if (userHasAcceptedMatch) {
      return NextResponse.json(
        {
          error:
            "Não é possível criar novos pedidos enquanto tens matches aceites pendentes. Por favor conclui ou rejeita os matches existentes primeiro.",
        },
        { status: 409 }
      );
    }

    const swapRequest = await prisma.singleSwapRequest.create({
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
    const preferredClassesInfo = await prisma.class.findMany({
      where: { id: { in: swapRequest.preferredClassIds } },
      select: { id: true, name: true, year: true },
    });

    // Trigger immediate matching in the background without relying on an internal HTTP hop.
    void triggerImmediateMatching(swapRequest.id, "single").catch((error) => {
      console.warn("Failed to trigger immediate matching:", error);
    });

    return NextResponse.json(
      {
        ...swapRequest,
        preferredClasses: preferredClassesInfo,
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
