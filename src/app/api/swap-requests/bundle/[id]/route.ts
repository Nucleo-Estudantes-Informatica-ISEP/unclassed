import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import prisma from "@/lib/prisma";

const updateBundleSwapRequestSchema = z.object({
  preferredClassIds: z.array(z.string()).min(1).optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
});

interface Params {
  id: string;
}

type BundleSwapRequestRouteContext = {
  params: Promise<Params>;
};

export async function GET(
  request: NextRequest,
  { params }: BundleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const swapRequest = await prisma.bundleSwapRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        currentClass: {
          select: { id: true, name: true, year: true }
        }
      }
    });

    if (!swapRequest) {
      return NextResponse.json(
        { error: "Pedido de permuta não encontrado" },
        { status: 404 }
      );
    }

    // Users can only see their own requests unless they are admin
    if (session.role !== "ADMIN" && swapRequest.userId !== session.id) {
      return NextResponse.json({ error: "Acesso proibido" }, { status: 403 });
    }

    // Add preferred classes info
    const preferredClasses = await prisma.class.findMany({
      where: { id: { in: swapRequest.preferredClassIds } },
      select: { id: true, name: true, year: true }
    });

    return NextResponse.json({ ...swapRequest, preferredClasses });
  } catch (error) {
    console.error("Error fetching bundle swap request:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: BundleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const body = await request.json();
    const validatedData = updateBundleSwapRequestSchema.parse(body);

    const existingRequest = await prisma.bundleSwapRequest.findUnique({
      where: { id },
      include: {
        currentClass: true
      }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Pedido de permuta não encontrado" },
        { status: 404 }
      );
    }

    // Users can only update their own requests unless they are admin
    if (session.role !== "ADMIN" && existingRequest.userId !== session.id) {
      return NextResponse.json({ error: "Acesso proibido" }, { status: 403 });
    }

    // If updating preferred classes, verify they exist and are from the same year
    if (validatedData.preferredClassIds) {
      const preferredClasses = await prisma.class.findMany({
        where: { id: { in: validatedData.preferredClassIds } }
      });

      if (preferredClasses.length !== validatedData.preferredClassIds.length) {
        return NextResponse.json(
          { error: "Uma ou mais turmas preferidas não foram encontradas" },
          { status: 404 }
        );
      }

      // Verify all classes are from the same year as current class
      const allClasses = [existingRequest.currentClass, ...preferredClasses];
      const years = Array.from(new Set(allClasses.map(c => c.year)));
      if (years.length > 1) {
        return NextResponse.json(
          { error: "Todas as turmas têm de ser do mesmo ano letivo" },
          { status: 400 }
        );
      }
    }

    const updatedRequest = await prisma.bundleSwapRequest.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
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
    const preferredClasses = await prisma.class.findMany({
      where: { id: { in: updatedRequest.preferredClassIds } },
      select: { id: true, name: true, year: true }
    });

    return NextResponse.json({ ...updatedRequest, preferredClasses });

  } catch (error) {
    console.error("Error updating bundle swap request:", error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: BundleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const existingRequest = await prisma.bundleSwapRequest.findUnique({
      where: { id }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Pedido de permuta não encontrado" },
        { status: 404 }
      );
    }

    // Users can only delete their own requests unless they are admin
    if (session.role !== "ADMIN" && existingRequest.userId !== session.id) {
      return NextResponse.json({ error: "Acesso proibido" }, { status: 403 });
    }

    await prisma.bundleSwapRequest.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Pedido de permuta completa eliminado com sucesso" });

  } catch (error) {
    console.error("Error deleting bundle swap request:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
