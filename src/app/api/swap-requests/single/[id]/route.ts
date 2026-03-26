import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

const updateSingleSwapRequestSchema = z.object({
  preferredClassIds: z.array(z.string()).min(1).optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
});

interface Params {
  id: string;
}

type SingleSwapRequestRouteContext = {
  params: Promise<Params>;
};

export async function GET(
  request: NextRequest,
  { params }: SingleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const swapRequest = await prisma.singleSwapRequest.findUnique({
      where: { id },
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
    console.error("Error fetching single swap request:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: SingleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSingleSwapRequestSchema.parse(body);

    const existingRequest = await prisma.singleSwapRequest.findUnique({
      where: { id }
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

    // If updating preferred classes, verify they exist
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
    }

    const updatedRequest = await prisma.singleSwapRequest.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
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
    const preferredClasses = await prisma.class.findMany({
      where: { id: { in: updatedRequest.preferredClassIds } },
      select: { id: true, name: true, year: true }
    });

    return NextResponse.json({ ...updatedRequest, preferredClasses });

  } catch (error) {
    console.error("Error updating single swap request:", error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: SingleSwapRequestRouteContext
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const existingRequest = await prisma.singleSwapRequest.findUnique({
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

    await prisma.singleSwapRequest.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Pedido de permuta eliminado com sucesso" });

  } catch (error) {
    console.error("Error deleting single swap request:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
