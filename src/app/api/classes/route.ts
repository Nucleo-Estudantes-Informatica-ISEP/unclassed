import { NextRequest, NextResponse } from "next/server";

import * as classRepo from "@/application/repositories/classRepository";
import { authorizeRequest } from "@/lib/apiAccess";
import {
  createClassSchema,
  classNameMatchesYear,
  deleteReferenceDataSchema,
  updateClassSchema,
} from "@/schemas/referenceDataSchema";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isPrismaErrorWithCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function handleWriteError(error: unknown) {
  if (isPrismaErrorWithCode(error, "P2002")) {
    return errorResponse(
      "A class with this name already exists.",
      409,
    );
  }

  if (isPrismaErrorWithCode(error, "P2025")) {
    return errorResponse("Class not found.", 404);
  }

  console.error("Failed to modify class:", error);

  return errorResponse("An unexpected error occurred.", 500);
}

async function readBody(request: NextRequest): Promise<unknown> {
  return request.json();
}

export async function GET(request: NextRequest) {
  const access = await authorizeRequest(request);

  if (!access.ok) {
    return access.response;
  }

  try {
    const yearParam = new URL(request.url).searchParams.get("year");
    let year: number | undefined;

    if (yearParam !== null) {
      year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1 || year > 3) {
        return errorResponse("Invalid academic year.", 400);
      }
    }

    const classes = await classRepo.findClasses({ year });
    return NextResponse.json(classes);
  } catch (error) {
    console.error("Failed to load classes:", error);
    return errorResponse("Failed to load classes.", 500);
  }
}

export async function POST(request: NextRequest) {
  const access = await authorizeRequest(request, {
    requireAdmin: true,
    enforceSameOriginForSessionWrites: true,
  });

  if (!access.ok) {
    return access.response;
  }

  let body: unknown;

  try {
    body = await readBody(request);
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = createClassSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Invalid class data.", 400);
  }

  try {
    if (await classRepo.hasNameConflict(parsed.data.name)) {
      return errorResponse("A class with this name already exists.", 409);
    }

    const created = await classRepo.create({
      data: parsed.data,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleWriteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await authorizeRequest(request, {
    requireAdmin: true,
    enforceSameOriginForSessionWrites: true,
  });

  if (!access.ok) {
    return access.response;
  }

  let body: unknown;

  try {
    body = await readBody(request);
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = updateClassSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Invalid class data.", 400);
  }

  const { id, ...data } = parsed.data;

  try {
    const existingClass = await classRepo.findById(id);

    if (!existingClass) {
      return errorResponse("Class not found.", 404);
    }

    const finalName = data.name ?? existingClass.name;
    const finalYear = data.year ?? existingClass.year;

    if (!classNameMatchesYear(finalName, finalYear)) {
      return errorResponse("Class name must start with the selected year.", 400);
    }

    if (
      data.name !== undefined &&
      (await classRepo.hasNameConflict(data.name, id))
    ) {
      return errorResponse("A class with this name already exists.", 409);
    }

    const updated = await classRepo.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleWriteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await authorizeRequest(request, {
    requireAdmin: true,
    enforceSameOriginForSessionWrites: true,
  });

  if (!access.ok) {
    return access.response;
  }

  let body: unknown;

  try {
    body = await readBody(request);
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = deleteReferenceDataSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Invalid class ID.", 400);
  }

  const { id } = parsed.data;

  try {
    if (await classRepo.isInUse(id)) {
      return errorResponse(
        "Cannot delete a class that is currently in use.",
        409,
      );
    }

    await classRepo.remove({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleWriteError(error);
  }
}
