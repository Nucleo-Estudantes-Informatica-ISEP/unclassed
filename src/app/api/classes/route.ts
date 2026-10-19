import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import {
  errorResponse,
  handleReferenceDataWriteError,
} from "@/lib/referenceDataApi";
import * as classRepo from "@/application/repositories/classRepository";
import {
  classNameMatchesYear,
  createClassSchema,
  deleteReferenceDataSchema,
  updateClassSchema,
} from "@/schemas/referenceDataSchema";

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { request } = context;
    const yearParam = new URL(request.url).searchParams.get("year");
    let year: number | undefined;

    if (yearParam !== null) {
      year = Number(yearParam);

      if (!Number.isInteger(year) || year < 1 || year > 3) {
        return errorResponse("Ano letivo inválido.", 400);
      }
    }

    try {
      const classes = await classRepo.findClasses({ year });
      return NextResponse.json(classes);
    } catch (error) {
      console.error("Failed to load classes:", error);
      return errorResponse("Não foi possível carregar as turmas.", 500);
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

    const parsed = createClassSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Dados da turma inválidos.", 400);
    }

    try {
      if (await classRepo.hasNameConflict(parsed.data.name)) {
        return errorResponse("Já existe uma turma com este nome.", 409);
      }

      const created = await classRepo.create({
        data: parsed.data,
      });

      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      return handleReferenceDataWriteError(error, "class");
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

    const parsed = updateClassSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Dados da turma inválidos.", 400);
    }

    const { id, ...data } = parsed.data;

    try {
      const existingClass = await classRepo.findById(id);

      if (!existingClass) {
        return errorResponse("Turma não encontrada.", 404);
      }

      const finalName = data.name ?? existingClass.name;
      const finalYear = data.year ?? existingClass.year;

      const changesName =
        data.name !== undefined &&
        data.name.trim().toUpperCase() !==
          existingClass.name.trim().toUpperCase();

      const changesYear =
        data.year !== undefined && data.year !== existingClass.year;

      if ((changesName || changesYear) && (await classRepo.isInUse(id))) {
        return errorResponse(
          "Não é possível alterar uma turma que está em utilização.",
          409
        );
      }

      if (!classNameMatchesYear(finalName, finalYear)) {
        return errorResponse(
          "O nome da turma deve começar pelo ano selecionado.",
          400
        );
      }

      if (
        data.name !== undefined &&
        (await classRepo.hasNameConflict(data.name, id))
      ) {
        return errorResponse("Já existe uma turma com este nome.", 409);
      }

      const updated = await classRepo.update({
        where: { id },
        data,
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleReferenceDataWriteError(error, "class");
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
      return errorResponse("Identificador da turma inválido.", 400);
    }

    const { id } = parsed.data;

    try {
      if (await classRepo.isInUse(id)) {
        return errorResponse(
          "Não é possível eliminar uma turma que está em utilização.",
          409
        );
      }

      await classRepo.remove({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleReferenceDataWriteError(error, "class");
    }
  },
});
