import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import * as classRepo from "@/application/repositories/classRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import { toSingleSwapRequestDto } from "@/services/swapRequestDto";

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
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const swapRequest = await singleSwapRequestRepo.findById(id, {
      user: {
        select: { id: true, name: true, email: true },
      },
      subject: {
        select: { id: true, code: true, name: true, year: true },
      },
      currentClass: {
        select: { id: true, name: true, year: true },
      },
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
    const preferredClasses = await classRepo.findManyByIds(swapRequest.preferredClassIds);

    return NextResponse.json(
      toSingleSwapRequestDto(
        swapRequest as Parameters<typeof toSingleSwapRequestDto>[0],
        preferredClasses
      )
    );
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
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const body = await request.json();
    const validatedData = updateSingleSwapRequestSchema.parse(body);

    const existingRequest = await singleSwapRequestRepo.findById(id);

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
      const preferredClasses = await classRepo.findManyByIds(validatedData.preferredClassIds);

      if (preferredClasses.length !== validatedData.preferredClassIds.length) {
        return NextResponse.json(
          { error: "Uma ou mais turmas preferidas não foram encontradas" },
          { status: 404 }
        );
      }
    }

    const updatedRequest = await singleSwapRequestRepo.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
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
    const preferredClasses = await classRepo.findManyByIds(updatedRequest.preferredClassIds);

    return NextResponse.json(
      toSingleSwapRequestDto(
        updatedRequest as Parameters<typeof toSingleSwapRequestDto>[0],
        preferredClasses
      )
    );

  } catch (error) {
    console.error("Error updating single swap request:", error);
    
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
  { params }: SingleSwapRequestRouteContext
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

    const existingRequest = await singleSwapRequestRepo.findById(id);

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

    await singleSwapRequestRepo.remove({
      where: { id },
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
