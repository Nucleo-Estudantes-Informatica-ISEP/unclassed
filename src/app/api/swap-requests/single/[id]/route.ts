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

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const swapRequest = await prisma.singleSwapRequest.findUnique({
      where: { id: params.id },
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
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    // Users can only see their own requests unless they are admin
    if (session.role !== "ADMIN" && swapRequest.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSingleSwapRequestSchema.parse(body);

    const existingRequest = await prisma.singleSwapRequest.findUnique({
      where: { id: params.id }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    // Users can only update their own requests unless they are admin
    if (session.role !== "ADMIN" && existingRequest.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If updating preferred classes, verify they exist
    if (validatedData.preferredClassIds) {
      const preferredClasses = await prisma.class.findMany({
        where: { id: { in: validatedData.preferredClassIds } }
      });

      if (preferredClasses.length !== validatedData.preferredClassIds.length) {
        return NextResponse.json(
          { error: "One or more preferred classes not found" },
          { status: 404 }
        );
      }
    }

    const updatedRequest = await prisma.singleSwapRequest.update({
      where: { id: params.id },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingRequest = await prisma.singleSwapRequest.findUnique({
      where: { id: params.id }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    // Users can only delete their own requests unless they are admin
    if (session.role !== "ADMIN" && existingRequest.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.singleSwapRequest.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Swap request deleted successfully" });

  } catch (error) {
    console.error("Error deleting single swap request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
