import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number) {
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

export function handleReferenceDataWriteError(
  error: unknown,
  entity: "class" | "subject"
) {
  const messages =
    entity === "class"
      ? {
          conflict: "Já existe uma turma com este nome.",
          notFound: "Turma não encontrada.",
          log: "Failed to modify class:",
        }
      : {
          conflict: "Já existe uma disciplina com este código.",
          notFound: "Disciplina não encontrada.",
          log: "Failed to modify subject:",
        };

  if (isPrismaErrorWithCode(error, "P2002")) {
    return errorResponse(messages.conflict, 409);
  }

  if (isPrismaErrorWithCode(error, "P2025")) {
    return errorResponse(messages.notFound, 404);
  }

  console.error(messages.log, error);

  return errorResponse("Ocorreu um erro inesperado.", 500);
}
