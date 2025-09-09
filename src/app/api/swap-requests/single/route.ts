import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

const createSingleSwapRequestSchema = z.object({
  subjectId: z.string(),
  currentClassId: z.string(),
  preferredClassIds: z.array(z.string()).min(1),
  preferenceOrderMatters: z.boolean().default(true),
});

const updateSingleSwapRequestSchema = z.object({
  preferredClassIds: z.array(z.string()).min(1).optional(),
  preferenceOrderMatters: z.boolean().optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {};
    
    // If not admin, users can only see their own requests
    if (session.role !== "ADMIN") {
      where.userId = session.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const swapRequests = await prisma.singleSwapRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        subject: {
          select: { id: true, code: true, name: true, year: true }
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
    console.error("Error fetching single swap requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSingleSwapRequestSchema.parse(body);

    // Verify the subject and classes exist
    const [subject, currentClass, preferredClasses] = await Promise.all([
      prisma.subject.findUnique({ where: { id: validatedData.subjectId } }),
      prisma.class.findUnique({ where: { id: validatedData.currentClassId } }),
      prisma.class.findMany({ 
        where: { id: { in: validatedData.preferredClassIds } } 
      })
    ]);

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (!currentClass) {
      return NextResponse.json({ error: "Current class not found" }, { status: 404 });
    }

    if (preferredClasses.length !== validatedData.preferredClassIds.length) {
      return NextResponse.json({ error: "One or more preferred classes not found" }, { status: 404 });
    }

    // Check if user already has an active request for this subject
    const existingRequest = await prisma.singleSwapRequest.findFirst({
      where: {
        userId: session.id,
        subjectId: validatedData.subjectId,
        status: "ACTIVE"
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have an active request for this subject" },
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
      const participants = match.participants as any[];
      return participants.some(p => p.userId === session.id && p.status === 'accepted');
    });

    if (userHasAcceptedMatch) {
      return NextResponse.json(
        { error: "Não é possível criar novos pedidos enquanto tem matches aceites pendentes. Por favor complete ou rejeite os matches existentes primeiro." },
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
        graphPartition: `subject-${validatedData.subjectId}`
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        subject: {
          select: { id: true, code: true, name: true, year: true }
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

    // Trigger immediate matching in background (don't await to avoid blocking)
    const baseUrl = process.env.NEXTAUTH_URL || 
                   (request.headers.get('host') ? 
                    `http://${request.headers.get('host')}` : 
                    'http://localhost:3000');
    fetch(`${baseUrl}/api/matching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({
        requestId: swapRequest.id,
        requestType: 'single'
      })
    }).catch(error => {
      console.warn('Failed to trigger immediate matching:', error);
    });

    return NextResponse.json(
      { 
        ...swapRequest, 
        preferredClasses: preferredClassesInfo,
        message: "Pedido criado com sucesso! A procurar matches imediatos..."
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating single swap request:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
