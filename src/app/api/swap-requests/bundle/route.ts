import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import prisma from "@/lib/prisma";
import { hasBlockingAcceptedMatch } from "@/services/matchParticipation";
import { triggerImmediateMatching } from "@/services/matchingTriggers";

const createBundleSwapRequestSchema = z.object({
  currentClassId: z.string(),
  preferredClassIds: z.array(z.string()).min(1),
  preferenceOrderMatters: z.boolean().default(true),
});

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

    const swapRequests = await prisma.bundleSwapRequest.findMany({
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
        const preferredClasses = await prisma.class.findMany({
          where: { id: { in: request.preferredClassIds } },
          select: { id: true, name: true, year: true },
        });
        return { ...request, preferredClasses };
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
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const body = await request.json();
    const validatedData = createBundleSwapRequestSchema.parse(body);

    // Verify the classes exist
    const [currentClass, preferredClasses] = await Promise.all([
      prisma.class.findUnique({ where: { id: validatedData.currentClassId } }),
      prisma.class.findMany({
        where: { id: { in: validatedData.preferredClassIds } },
      }),
    ]);

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

    // Verify classes are from the same year
    const allClasses = [currentClass, ...preferredClasses];
    const years = Array.from(new Set(allClasses.map((c) => c.year)));
    if (years.length > 1) {
      return NextResponse.json(
        { error: "Todas as turmas têm de ser do mesmo ano letivo" },
        { status: 400 }
      );
    }

    // Check if user already has an active request for this class
    const existingRequest = await prisma.bundleSwapRequest.findFirst({
      where: {
        userId: session.id,
        currentClassId: validatedData.currentClassId,
        status: "ACTIVE",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error: "Já tens um pedido de permuta completa ativo para esta turma",
        },
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

    const swapRequest = await prisma.bundleSwapRequest.create({
      data: {
        userId: session.id,
        currentClassId: validatedData.currentClassId,
        preferredClassIds: validatedData.preferredClassIds,
        preferenceOrderMatters: validatedData.preferenceOrderMatters,
        ticketType: "ALL_CLASSES",
        priority: 1, // Default priority
        status: "ACTIVE",
        graphPartition: `year-${currentClass.year}`,
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
    const preferredClassesInfo = await prisma.class.findMany({
      where: { id: { in: swapRequest.preferredClassIds } },
      select: { id: true, name: true, year: true },
    });

    // Trigger immediate matching in the background without relying on an internal HTTP hop.
    void triggerImmediateMatching(swapRequest.id, "bundle").catch((error) => {
      console.warn("Failed to trigger immediate matching:", error);
    });

    if (session.onboardingCompletedAt === null) {
      void prisma.user
        .update({
          where: { id: session.id },
          data: { onboardingCompletedAt: new Date() },
        })
        .catch((error) => {
          console.warn("Failed to record onboarding completion:", error);
        });
    }

    return NextResponse.json(
      {
        ...swapRequest,
        preferredClasses: preferredClassesInfo,
        message:
          "Pedido de permuta completa criado! A procurar matches imediatos...",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating bundle swap request:", error);

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
