import { SessionUser } from "./userService";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";
import * as requestService from "@/application/services/requestService";
import * as userService from "@/application/services/userService";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";
import { buildPartitionKey } from "@/services/partitionKey";

// ============================================================================
// Domain Errors
// ============================================================================

export class SwapRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SwapRequestNotFoundError extends SwapRequestError {
  constructor(message = "Pedido de permuta não encontrado") {
    super(message);
  }
}

export class SwapRequestForbiddenError extends SwapRequestError {
  constructor(message = "Acesso proibido a este pedido de permuta") {
    super(message);
  }
}

export class SwapRequestConflictError extends SwapRequestError {
  constructor(message: string) {
    super(message);
  }
}

export class SwapRequestValidationError extends SwapRequestError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function assertCanManageSwapRequest(session: SessionUser, requestUserId: string) {
  if (session.role !== "ADMIN" && requestUserId !== session.id) {
    throw new SwapRequestForbiddenError();
  }
}

function triggerMatchingSilently(id: string, type: "single" | "bundle", context: string) {
  void triggerImmediateMatching(id, type).catch((error: unknown) => {
    console.warn(`Failed to trigger immediate matching on ${context} for ${type} request ${id}:`, error);
  });
}

function ensureOnboardingRecorded(session: SessionUser) {
  if (session.onboardingCompletedAt === null) {
    void userService.markOnboardingComplete(session.id).catch((error: unknown) => {
      console.warn("Failed to record onboarding completion:", error);
    });
  }
}

// ============================================================================
// Services
// ============================================================================

export interface ListSwapRequestsInput {
  session: SessionUser;
  queryUserId?: string | null;
  queryStatus?: string | null;
  type: "single" | "bundle";
}

export async function listSwapRequests(input: ListSwapRequestsInput) {
  const { session, queryUserId, queryStatus, type } = input;

  const where: { userId?: string; status?: "ACTIVE" | "CANCELLED" } = {};

  if (session.role !== "ADMIN") {
    where.userId = session.id;
  } else if (queryUserId) {
    where.userId = queryUserId;
  }

  if (queryStatus === "ACTIVE" || queryStatus === "CANCELLED") {
    where.status = queryStatus;
  }

  if (type === "single") {
    return singleSwapRequestRepo.listWithDetails({
      where,
      orderBy: { createdAt: "desc" },
    });
  } else {
    return bundleSwapRequestRepo.listWithDetails({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}

export async function getSwapRequestById(session: SessionUser, id: string, type: "single" | "bundle") {
  const request =
    type === "single"
      ? await singleSwapRequestRepo.getByIdWithDetails(id)
      : await bundleSwapRequestRepo.getByIdWithDetails(id);

  if (!request) {
    throw new SwapRequestNotFoundError();
  }

  assertCanManageSwapRequest(session, request.userId);
  return request;
}

export interface CreateSingleSwapRequestInput {
  subjectId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters: boolean;
}

export async function createSingleSwapRequest(session: SessionUser, input: CreateSingleSwapRequestInput) {
  const validation = await requestService.validateSingleRequestCreation({
    userId: session.id,
    subjectId: input.subjectId,
    currentClassId: input.currentClassId,
    preferredClassIds: input.preferredClassIds,
  });

  if (!validation.ok) {
    if (validation.status === 409) {
      throw new SwapRequestConflictError(validation.error);
    }
    throw new SwapRequestValidationError(validation.error);
  }

  try {
    const requestDto = await singleSwapRequestRepo.createWithDetails({
      data: {
        userId: session.id,
        subjectId: input.subjectId,
        currentClassId: input.currentClassId,
        preferredClassIds: input.preferredClassIds,
        preferenceOrderMatters: input.preferenceOrderMatters,
        ticketType: "SPECIFIC_CLASS",
        priority: 1,
        status: "ACTIVE",
        graphPartition: buildPartitionKey({
          ticketType: "SPECIFIC_CLASS",
          subjectId: input.subjectId,
        }),
      },
    });

    triggerMatchingSilently(requestDto.id, "single", "creation");
    ensureOnboardingRecorded(session);

    return requestDto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SwapRequestConflictError("Já tens um pedido ativo para esta disciplina");
    }
    throw error;
  }
}

export interface CreateBundleSwapRequestInput {
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters: boolean;
}

export async function createBundleSwapRequest(session: SessionUser, input: CreateBundleSwapRequestInput) {
  const validation = await requestService.validateBundleRequestCreation({
    userId: session.id,
    currentClassId: input.currentClassId,
    preferredClassIds: input.preferredClassIds,
  });

  if (!validation.ok) {
    if (validation.status === 409) {
      throw new SwapRequestConflictError(validation.error);
    }
    throw new SwapRequestValidationError(validation.error);
  }

  try {
    const requestDto = await bundleSwapRequestRepo.createWithDetails({
      data: {
        userId: session.id,
        currentClassId: input.currentClassId,
        preferredClassIds: input.preferredClassIds,
        preferenceOrderMatters: input.preferenceOrderMatters,
        ticketType: "ALL_CLASSES",
        priority: 1,
        status: "ACTIVE",
        graphPartition: buildPartitionKey({
          ticketType: "ALL_CLASSES",
          year: validation.currentClass.year,
        }),
      },
    });

    triggerMatchingSilently(requestDto.id, "bundle", "creation");
    ensureOnboardingRecorded(session);

    return requestDto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SwapRequestConflictError("Já tens um pedido de permuta completa ativo para esta turma");
    }
    throw error;
  }
}

export async function updateSwapRequestPreferredClasses(
  session: SessionUser,
  id: string,
  type: "single" | "bundle",
  preferredClassIds: string[]
) {
  if (preferredClassIds.length === 0) {
    throw new SwapRequestValidationError("Por favor seleciona pelo menos uma turma preferida");
  }

  if (type === "single") {
    const existing = await singleSwapRequestRepo.getByIdWithDetails(id);
    if (!existing) {
      throw new SwapRequestNotFoundError();
    }
    assertCanManageSwapRequest(session, existing.userId);

    if (existing.status !== "ACTIVE") {
      throw new SwapRequestConflictError("Apenas pedidos ativos podem ser editados");
    }

    const preferredClasses = await classRepo.findManyByIds(preferredClassIds);
    if (preferredClasses.length !== preferredClassIds.length) {
      throw new SwapRequestNotFoundError("Uma ou mais turmas preferidas não foram encontradas");
    }

    const result = await singleSwapRequestRepo.updateMany({
      where: { id, status: "ACTIVE" },
      data: { preferredClassIds, updatedAt: new Date() },
    });
    if (result.count === 0) {
      throw new SwapRequestConflictError("O pedido foi alterado ou já não se encontra ativo.");
    }

    const updatedDto = await singleSwapRequestRepo.getByIdWithDetails(id);
    if (!updatedDto) {
      throw new SwapRequestNotFoundError();
    }

    triggerMatchingSilently(id, "single", "update");
    return updatedDto;
  } else {
    const existing = await bundleSwapRequestRepo.getByIdWithDetails(id);
    if (!existing) {
      throw new SwapRequestNotFoundError();
    }
    assertCanManageSwapRequest(session, existing.userId);

    if (existing.status !== "ACTIVE") {
      throw new SwapRequestConflictError("Apenas pedidos ativos podem ser editados");
    }

    const preferredClasses = await classRepo.findManyByIds(preferredClassIds);
    if (preferredClasses.length !== preferredClassIds.length) {
      throw new SwapRequestNotFoundError("Uma ou mais turmas preferidas não foram encontradas");
    }

    const currentClass = await classRepo.findById(existing.currentClassId);
    if (!currentClass) {
      throw new SwapRequestNotFoundError("Turma atual não encontrada");
    }

    const allClasses = [currentClass, ...preferredClasses];
    const years = Array.from(new Set(allClasses.map((c) => c.year)));
    if (years.length > 1) {
      throw new SwapRequestValidationError("Todas as turmas têm de ser do mesmo ano letivo");
    }

    const result = await bundleSwapRequestRepo.updateMany({
      where: { id, status: "ACTIVE" },
      data: { preferredClassIds, updatedAt: new Date() },
    });
    if (result.count === 0) {
      throw new SwapRequestConflictError("O pedido foi alterado ou já não se encontra ativo.");
    }

    const updatedDto = await bundleSwapRequestRepo.getByIdWithDetails(id);
    if (!updatedDto) {
      throw new SwapRequestNotFoundError();
    }

    triggerMatchingSilently(id, "bundle", "update");
    return updatedDto;
  }
}

export async function cancelSwapRequest(session: SessionUser, id: string, type: "single" | "bundle") {
  if (type === "single") {
    const existing = await singleSwapRequestRepo.getByIdWithDetails(id);
    if (!existing) {
      throw new SwapRequestNotFoundError();
    }
    assertCanManageSwapRequest(session, existing.userId);

    if (existing.status !== "ACTIVE") {
      throw new SwapRequestConflictError("Apenas pedidos ativos podem ser cancelados");
    }

    const result = await singleSwapRequestRepo.updateMany({
      where: { id, status: "ACTIVE" },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });
    if (result.count === 0) {
      throw new SwapRequestConflictError("O pedido já não se encontra ativo.");
    }

    const updatedDto = await singleSwapRequestRepo.getByIdWithDetails(id);
    if (!updatedDto) {
      throw new SwapRequestNotFoundError();
    }
    return updatedDto;
  } else {
    const existing = await bundleSwapRequestRepo.getByIdWithDetails(id);
    if (!existing) {
      throw new SwapRequestNotFoundError();
    }
    assertCanManageSwapRequest(session, existing.userId);

    if (existing.status !== "ACTIVE") {
      throw new SwapRequestConflictError("Apenas pedidos ativos podem ser cancelados");
    }

    const result = await bundleSwapRequestRepo.updateMany({
      where: { id, status: "ACTIVE" },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });
    if (result.count === 0) {
      throw new SwapRequestConflictError("O pedido já não se encontra ativo.");
    }

    const updatedDto = await bundleSwapRequestRepo.getByIdWithDetails(id);
    if (!updatedDto) {
      throw new SwapRequestNotFoundError();
    }
    return updatedDto;
  }
}

export async function deleteSwapRequest(session: SessionUser, id: string, type: "single" | "bundle") {
  const repo = type === "single" ? singleSwapRequestRepo : bundleSwapRequestRepo;

  const existingRequest = await repo.getByIdWithDetails(id);
  if (!existingRequest) {
    throw new SwapRequestNotFoundError();
  }

  assertCanManageSwapRequest(session, existingRequest.userId);

  if (existingRequest.status === "MATCHED" || existingRequest.status === "COMPLETED" || !!existingRequest.provisionalUntil) {
    throw new SwapRequestConflictError("Não é possível eliminar um pedido que possui matches associados.");
  }

  await repo.remove({ where: { id } });

  return { 
    message: type === "single"
      ? "Pedido de permuta eliminado com sucesso"
      : "Pedido de permuta completa eliminado com sucesso"
  };
}
