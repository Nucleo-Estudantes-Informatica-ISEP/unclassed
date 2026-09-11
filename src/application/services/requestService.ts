import * as classRepository from "@/application/repositories/classRepository";
import * as subjectRepository from "@/application/repositories/subjectRepository";
import * as singleSwapRequestRepository from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepository from "@/application/repositories/bundleSwapRequestRepository";
import { hasBlockingAcceptedMatch } from "@/services/matchParticipation";

type SingleRequestValidationInput = {
  userId: string;
  subjectId: string;
  currentClassId: string;
  preferredClassIds: string[];
};

type SingleRequestValidationSuccess = {
  ok: true;
  userId: string;
  subject: NonNullable<Awaited<ReturnType<typeof subjectRepository.findById>>>;
  currentClass: NonNullable<Awaited<ReturnType<typeof classRepository.findById>>>;
  preferredClasses: NonNullable<Awaited<ReturnType<typeof classRepository.findManyByIds>>>;
};

type SingleRequestValidationFailure = {
  ok: false;
  status: 404 | 409;
  error: string;
};

type BundleRequestValidationInput = {
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
};

type BundleRequestValidationSuccess = {
  ok: true;
  userId: string;
  currentClass: NonNullable<Awaited<ReturnType<typeof classRepository.findById>>>;
  preferredClasses: NonNullable<Awaited<ReturnType<typeof classRepository.findManyByIds>>>;
};

type BundleRequestValidationFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
};

export async function validateSingleRequestCreation(
  input: SingleRequestValidationInput
): Promise<SingleRequestValidationSuccess | SingleRequestValidationFailure> {
  const [subject, currentClass, preferredClasses] = await Promise.all([
    subjectRepository.findById(input.subjectId),
    classRepository.findById(input.currentClassId),
    classRepository.findManyByIds(input.preferredClassIds),
  ]);

  if (!subject) {
    return { ok: false, status: 404, error: "Disciplina não encontrada" };
  }

  if (!currentClass) {
    return { ok: false, status: 404, error: "Turma atual não encontrada" };
  }

  if (preferredClasses.length !== input.preferredClassIds.length) {
    return {
      ok: false,
      status: 404,
      error: "Uma ou mais turmas preferidas não foram encontradas",
    };
  }

  const existingRequest = await singleSwapRequestRepository.findFirst({
    userId: input.userId,
    subjectId: input.subjectId,
    status: "ACTIVE",
  });

  if (existingRequest) {
    return {
      ok: false,
      status: 409,
      error: "Já tens um pedido ativo para esta disciplina",
    };
  }

  const userHasAcceptedMatch = await hasBlockingAcceptedMatch(input.userId);

  if (userHasAcceptedMatch) {
    return {
      ok: false,
      status: 409,
      error:
        "Não é possível criar novos pedidos enquanto tens matches aceites pendentes. Por favor conclui ou rejeita os matches existentes primeiro.",
    };
  }

  return {
    ok: true,
    userId: input.userId,
    subject,
    currentClass,
    preferredClasses,
  };
}

export async function validateBundleRequestCreation(
  input: BundleRequestValidationInput
): Promise<BundleRequestValidationSuccess | BundleRequestValidationFailure> {
  const [currentClass, preferredClasses] = await Promise.all([
    classRepository.findById(input.currentClassId),
    classRepository.findManyByIds(input.preferredClassIds),
  ]);

  if (!currentClass) {
    return { ok: false, status: 404, error: "Turma atual não encontrada" };
  }

  if (preferredClasses.length !== input.preferredClassIds.length) {
    return {
      ok: false,
      status: 404,
      error: "Uma ou mais turmas preferidas não foram encontradas",
    };
  }

  const allClasses = [currentClass, ...preferredClasses];
  const years = Array.from(new Set(allClasses.map((classItem) => classItem.year)));

  if (years.length > 1) {
    return {
      ok: false,
      status: 400,
      error: "Todas as turmas têm de ser do mesmo ano letivo",
    };
  }

  const existingRequest = await bundleSwapRequestRepository.findFirst({
    userId: input.userId,
    currentClassId: input.currentClassId,
    status: "ACTIVE",
  });

  if (existingRequest) {
    return {
      ok: false,
      status: 409,
      error: "Já tens um pedido de permuta completa ativo para esta turma",
    };
  }

  const userHasAcceptedMatch = await hasBlockingAcceptedMatch(input.userId);

  if (userHasAcceptedMatch) {
    return {
      ok: false,
      status: 409,
      error:
        "Não é possível criar novos pedidos enquanto tens matches aceites pendentes. Por favor conclui ou rejeita os matches existentes primeiro.",
    };
  }

  return {
    ok: true,
    userId: input.userId,
    currentClass,
    preferredClasses,
  };
}
