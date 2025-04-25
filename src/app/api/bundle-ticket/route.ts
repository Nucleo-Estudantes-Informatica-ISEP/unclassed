import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import prisma from "@/lib/prisma";

const bundleTicketSchema = z.object({
  userId: z.string(),
  currentClassId: z.string(),
  preferredClassIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bundleTicketSchema.parse(body);
    const { userId, currentClassId, preferredClassIds } = data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { course: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    // Check if user has an open bundle ticket
    const existing = await prisma.bundleSwapRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING"] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Você já possui um ticket de troca de turma aberto." },
        { status: 400 }
      );
    }

    // Check if current class exists and belongs to user's course
    const currentClass = await prisma.class.findUnique({
      where: { id: currentClassId },
    });

    if (!currentClass) {
      return NextResponse.json({ error: "Turma atual não encontrada." }, { status: 404 });
    }

    if (currentClass.courseId !== user.courseId) {
      return NextResponse.json(
        { error: "A turma atual não pertence ao curso do utilizador." },
        { status: 400 }
      );
    }

    // Validate preferred classes
    const preferredClasses = await prisma.class.findMany({
      where: { id: { in: preferredClassIds } },
    });

    if (preferredClasses.length !== preferredClassIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais turmas pretendidas não foram encontradas." },
        { status: 404 }
      );
    }

    const invalidClass = preferredClasses.find(
        (cls: { courseId: string }) => cls.courseId !== user.courseId
      );
      

    if (invalidClass) {
      return NextResponse.json(
        { error: "Uma ou mais turmas pretendidas pertencem a outro curso." },
        { status: 400 }
      );
    }

    // Create the ticket request
    const newRequest = await prisma.bundleSwapRequest.create({
      data: {
        userId,
        currentClassId,
        preferredClassIds,
        status: "PENDING",
        lastProcessed: new Date(),
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }

    console.error("Erro ao criar ticket de troca de turma:", e);
    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}
