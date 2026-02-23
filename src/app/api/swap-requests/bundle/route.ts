import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

const createBundleSwapRequestSchema = z.object({
  currentClassId: z.string(),
  preferredClassIds: z.array(z.string()).min(1),
  preferenceOrderMatters: z.boolean().default(true),
});

interface MatchParticipant {
  userId?: string;
  status?: string;
}

function coerceMatchParticipants(value: unknown): MatchParticipant[] {
  if (!Array.isArray(value)) return [];
  return value as MatchParticipant[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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

    if (status) {
      where.status = status;
    }

    const swapRequests = await prisma.bundleSwapRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        currentClass: {
          select: { id: true, name: true, year: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Add preferred classes info
    const swapRequestsWithClasses = await Promise.all(
      swapRequests.map(async (request) => {
        const preferredClasses = await prisma.class.findMany({
          where: { id: { in: request.preferredClassIds } },
          select: { id: true, name: true, year: true }
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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBundleSwapRequestSchema.parse(body);

    // Verify the classes exist
    const [currentClass, preferredClasses] = await Promise.all([
      prisma.class.findUnique({ where: { id: validatedData.currentClassId } }),
      prisma.class.findMany({ 
        where: { id: { in: validatedData.preferredClassIds } } 
      })
    ]);

    if (!currentClass) {
      return NextResponse.json({ error: "Turma atual não encontrada" }, { status: 404 });
    }

    if (preferredClasses.length !== validatedData.preferredClassIds.length) {
      return NextResponse.json({ error: "Uma ou mais turmas preferidas não foram encontradas" }, { status: 404 });
    }

    // Verify classes are from the same year
    const allClasses = [currentClass, ...preferredClasses];
    const years = Array.from(new Set(allClasses.map(c => c.year)));
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
        status: "ACTIVE"
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Já tens um pedido de permuta completa ativo para esta turma" },
        { status: 409 }
      );
    }

    // Check if user has any accepted matches (prevent creating new requests while having pending matches)
    const acceptedMatches = await prisma.match.findMany({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED"] }
      }
    });

    // Check if user is participant in any accepted match
    const userHasAcceptedMatch = acceptedMatches.some(match => {
      const participants = coerceMatchParticipants(match.participants);
      return participants.some((p) => p.userId === session.id && p.status === "accepted");
    });

    if (userHasAcceptedMatch) {
      return NextResponse.json(
        { error: "Não é possível criar novos pedidos enquanto tens matches aceites pendentes. Por favor conclui ou rejeita os matches existentes primeiro." },
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
        graphPartition: `year-${currentClass.year}`
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        currentClass: {
          select: { id: true, name: true, year: true }
        }
      }
    });

    // Add preferred classes info
    const preferredClassesInfo = await prisma.class.findMany({
      where: { id: { in: swapRequest.preferredClassIds } },
      select: { id: true, name: true, year: true }
    });

    // Trigger immediate matching in background
    // For internal requests, use 127.0.0.1:3000 to avoid IPv6 resolution issues in Docker
    const baseUrl = 'http://127.0.0.1:3000';
    fetch(`${baseUrl}/api/matching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({
        requestId: swapRequest.id,
        requestType: 'bundle'
      })
    }).catch(error => {
      console.warn('Failed to trigger immediate matching:', error);
    });

    return NextResponse.json(
      { 
        ...swapRequest, 
        preferredClasses: preferredClassesInfo,
        message: "Pedido de permuta completa criado! A procurar matches imediatos..."
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating bundle swap request:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validação falhou", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
