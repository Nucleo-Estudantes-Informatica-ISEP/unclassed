import { NextRequest, NextResponse } from "next/server";

import * as subjectRepo from "@/application/repositories/subjectRepository";
import { authorizeRequest } from "@/lib/apiAccess";
import {
  createSubjectSchema,
  deleteReferenceDataSchema,
  updateSubjectSchema,
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
      "A subject with this code already exists.",
      409,
    );
  }

  if (isPrismaErrorWithCode(error, "P2025")) {
    return errorResponse("Subject not found.", 404);
  }

  console.error("Failed to modify subject:", error);

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
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const semesterParam = searchParams.get("semester");
    let year: number | undefined;
    let semester: number | undefined;

    if (yearParam !== null) {
      year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1 || year > 3) {
        return errorResponse("Invalid academic year.", 400);
      }
    }

    if (semesterParam !== null) {
      semester = Number(semesterParam);
      if (!Number.isInteger(semester) || semester < 1 || semester > 2) {
        return errorResponse("Invalid semester.", 400);
      }
    }

    const subjects = await subjectRepo.findSubjects({ year, semester });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Failed to load subjects:", error);
    return errorResponse("Failed to load subjects.", 500);
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

  const parsed = createSubjectSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Invalid subject data.", 400);
  }

  try {
    const created = await subjectRepo.create({
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

  const parsed = updateSubjectSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Invalid subject data.", 400);
  }

  const { id, ...data } = parsed.data;

  try {
    const updated = await subjectRepo.update({
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
    return errorResponse("Invalid subject ID.", 400);
  }

  const { id } = parsed.data;

  try {
    if (await subjectRepo.isInUse(id)) {
      return errorResponse(
        "Cannot delete a subject that is currently in use.",
        409,
      );
    }

    await subjectRepo.remove({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleWriteError(error);
  }
}
