import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import {
  errorResponse,
  handleReferenceDataWriteError,
} from "@/lib/referenceDataApi";
import * as subjectRepo from "@/application/repositories/subjectRepository";
import {
  createSubjectSchema,
  deleteReferenceDataSchema,
  updateSubjectSchema,
} from "@/schemas/referenceDataSchema";

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { request } = context;
    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const semesterParam = searchParams.get("semester");

    let year: number | undefined;
    let semester: number | undefined;

    if (yearParam !== null) {
      year = Number(yearParam);

      if (!Number.isInteger(year) || year < 1 || year > 3) {
        return errorResponse("Ano letivo inválido.", 400);
      }
    }

    if (semesterParam !== null) {
      semester = Number(semesterParam);

      if (!Number.isInteger(semester) || semester < 1 || semester > 2) {
        return errorResponse("Semestre inválido.", 400);
      }
    }

    try {
      const subjects = await subjectRepo.findSubjects({
        year,
        semester,
      });

      return NextResponse.json(subjects);
    } catch (error) {
      console.error("Failed to load subjects:", error);
      return errorResponse("Não foi possível carregar as disciplinas.", 500);
    }
  },
});

export const POST = defineHandler({
  auth: { requireAdmin: true },
  handler: async ({ request }) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Corpo JSON inválido.", 400);
    }

    const parsed = createSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Dados da disciplina inválidos.", 400);
    }

    try {
      const created = await subjectRepo.create({
        data: parsed.data,
      });

      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      return handleReferenceDataWriteError(error, "subject");
    }
  },
});

export const PATCH = defineHandler({
  auth: { requireAdmin: true },
  handler: async ({ request }) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Corpo JSON inválido.", 400);
    }

    const parsed = updateSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Dados da disciplina inválidos.", 400);
    }

    const { id, ...data } = parsed.data;

    try {
      if (
        data.code !== undefined ||
        data.year !== undefined ||
        data.semester !== undefined
      ) {
        const existingSubject = await subjectRepo.findById(id);

        if (!existingSubject) {
          return errorResponse("Disciplina não encontrada.", 404);
        }

        const changesStructuralField =
          (data.code !== undefined && data.code !== existingSubject.code) ||
          (data.year !== undefined && data.year !== existingSubject.year) ||
          (data.semester !== undefined &&
            data.semester !== existingSubject.semester);

        if (changesStructuralField && (await subjectRepo.isInUse(id))) {
          return errorResponse(
            "Não é possível alterar o código, ano ou semestre de uma disciplina que está em utilização.",
            409
          );
        }
      }

      const updated = await subjectRepo.update({
        where: { id },
        data,
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleReferenceDataWriteError(error, "subject");
    }
  },
});

export const DELETE = defineHandler({
  auth: { requireAdmin: true },
  handler: async ({ request }) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Corpo JSON inválido.", 400);
    }

    const parsed = deleteReferenceDataSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Identificador da disciplina inválido.", 400);
    }

    const { id } = parsed.data;

    try {
      if (await subjectRepo.isInUse(id)) {
        return errorResponse(
          "Não é possível eliminar uma disciplina que está em utilização.",
          409
        );
      }

      await subjectRepo.remove({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleReferenceDataWriteError(error, "subject");
    }
  },
});
