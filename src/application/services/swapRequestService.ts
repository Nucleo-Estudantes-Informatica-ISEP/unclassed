import { SessionUser } from "./userService";
import * as classRepo from "@/application/repositories/classRepository";
import * as requestService from "@/application/services/requestService";
import * as userService from "@/application/services/userService";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";

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

export type SwapRequestStatus = "ACTIVE" | "CANCELLED" | "MATCHED" | "COMPLETED" | "EXPIRED";

export interface SwapRequestEntity {
  id: string;
  userId: string;
  status: SwapRequestStatus;
  currentClassId: string;
  provisionalUntil: Date | null;
  preferredClasses?: { id: string; name: string; year: number }[];
}

function isSwapRequestStatus(value: string): value is SwapRequestStatus {
  return [
    "ACTIVE",
    "CANCELLED",
    "MATCHED",
    "COMPLETED",
    "EXPIRED",
  ].includes(value);
}

export interface ISwapRequestRepository<TEntity extends SwapRequestEntity = SwapRequestEntity> {
  getByIdWithDetails(id: string): Promise<TEntity | null>;
  listWithDetails(filters: { userId?: string; status?: SwapRequestStatus }): Promise<TEntity[]>;
  updatePreferredClasses(id: string, preferredClassIds: string[]): Promise<TEntity>;
  cancel(id: string): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export interface ISingleSwapRequestRepository<TEntity extends SwapRequestEntity = SwapRequestEntity> extends ISwapRequestRepository<TEntity> {
  create(data: {
    userId: string;
    subjectId: string;
    currentClassId: string;
    preferredClassIds: string[];
    preferenceOrderMatters: boolean;
  }): Promise<TEntity>;
}

export interface IBundleSwapRequestRepository<TEntity extends SwapRequestEntity = SwapRequestEntity> extends ISwapRequestRepository<TEntity> {
  create(data: {
    userId: string;
    currentClassId: string;
    preferredClassIds: string[];
    preferenceOrderMatters: boolean;
    year: number;
  }): Promise<TEntity>;
}

function assertCanManageSwapRequest(session: SessionUser, requestUserId: string) {
  if (session.role !== "ADMIN" && requestUserId !== session.id) {
    throw new SwapRequestForbiddenError();
  }
}

async function getExistingRequest(session: SessionUser, id: string, repo: ISwapRequestRepository) {
  const existing = await repo.getByIdWithDetails(id);
  
  if (!existing) {
    throw new SwapRequestNotFoundError();
  }
  
  assertCanManageSwapRequest(session, existing.userId);
  
  return existing;
}

function triggerMatchingSilently(id: string, type: "single" | "bundle", context: string) {
  void triggerImmediateMatching(id, type).catch((error: unknown) => {
    console.warn(`Failed to trigger immediate matching on ${context} for ${type} request ${id}:`, error);
  });
}

async function ensureOnboardingRecorded(session: SessionUser) {
  if (session.onboardingCompletedAt === null) {
    try {
      await userService.markOnboardingComplete(session.id);
    } catch (error) {
      console.warn("Failed to record onboarding completion:", error);
    }
  }
}

// ============================================================================
// Services
// ============================================================================

export interface ListSwapRequestsInput {
  session: SessionUser;
  queryUserId?: string | null;
  queryStatus?: string | null;
  repo: ISwapRequestRepository;
}

export async function listSwapRequests(input: ListSwapRequestsInput) {
  const { session, queryUserId, queryStatus, repo } = input;

  const userId = session.role !== "ADMIN" ? session.id : (queryUserId || undefined);

  const status =
    queryStatus && isSwapRequestStatus(queryStatus)
      ? queryStatus
      : undefined;

  return repo.listWithDetails({
    userId,
    status,
  });
}

export async function getSwapRequestById(session: SessionUser, id: string, repo: ISwapRequestRepository) {
  const existing = await getExistingRequest(session, id, repo);
  return existing;
}

export interface CreateSingleSwapRequestInput {
  subjectId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters: boolean;
}

export async function createSingleSwapRequest(
  session: SessionUser, 
  input: CreateSingleSwapRequestInput,
  repo: ISingleSwapRequestRepository
) {
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
    if (validation.status === 404) {
      throw new SwapRequestNotFoundError(validation.error);
    }
    throw new SwapRequestValidationError(validation.error);
  }

  try {
    const requestDto = await repo.create({
      userId: session.id,
      subjectId: input.subjectId,
      currentClassId: input.currentClassId,
      preferredClassIds: input.preferredClassIds,
      preferenceOrderMatters: input.preferenceOrderMatters,
    });

    triggerMatchingSilently(requestDto.id, "single", "creation");
    await ensureOnboardingRecorded(session);

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

export async function createBundleSwapRequest(
  session: SessionUser, 
  input: CreateBundleSwapRequestInput,
  repo: IBundleSwapRequestRepository
) {
  const validation = await requestService.validateBundleRequestCreation({
    userId: session.id,
    currentClassId: input.currentClassId,
    preferredClassIds: input.preferredClassIds,
  });

  if (!validation.ok) {
    if (validation.status === 409) {
      throw new SwapRequestConflictError(validation.error);
    }
    if (validation.status === 404) {
      throw new SwapRequestNotFoundError(validation.error);
    }
    throw new SwapRequestValidationError(validation.error);
  }

  try {
    const requestDto = await repo.create({
      userId: session.id,
      currentClassId: input.currentClassId,
      preferredClassIds: input.preferredClassIds,
      preferenceOrderMatters: input.preferenceOrderMatters,
      year: validation.currentClass.year,
    });

    triggerMatchingSilently(requestDto.id, "bundle", "creation");
    await ensureOnboardingRecorded(session);

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
  repo: ISwapRequestRepository,
  preferredClassIds: string[]
) {
  if (preferredClassIds.length === 0) {
    throw new SwapRequestValidationError("Por favor seleciona pelo menos uma turma preferida");
  }

  const existing = await getExistingRequest(session, id, repo);

  if (existing.status !== "ACTIVE") {
    throw new SwapRequestConflictError("Apenas pedidos ativos podem ser editados");
  }

  const preferredClasses = await classRepo.findManyByIds(preferredClassIds);
  if (preferredClasses.length !== preferredClassIds.length) {
    throw new SwapRequestNotFoundError("Uma ou mais turmas preferidas não foram encontradas");
  }

  if (type === "bundle") {
    const currentClass = await classRepo.findById(existing.currentClassId);
    if (!currentClass) {
      throw new SwapRequestNotFoundError("Turma atual não encontrada");
    }

    const allClasses = [currentClass, ...preferredClasses];
    const years = Array.from(new Set(allClasses.map((c) => c.year)));
    if (years.length > 1) {
      throw new SwapRequestValidationError("Todas as turmas têm de ser do mesmo ano letivo");
    }
  }

  const updatedDto = await repo.updatePreferredClasses(id, preferredClassIds);

  triggerMatchingSilently(id, type, "update");
  return updatedDto;
}

export async function cancelSwapRequest(
  session: SessionUser, 
  id: string, 
  repo: ISwapRequestRepository
) {
  const existing = await getExistingRequest(session, id, repo);

  if (existing.status !== "ACTIVE") {
    throw new SwapRequestConflictError("Apenas pedidos ativos podem ser cancelados");
  }

  const updatedDto = await repo.cancel(id);
  
  return updatedDto;
}

export async function deleteSwapRequest(
  session: SessionUser, 
  id: string, 
  repo: ISwapRequestRepository
) {
  const existingRequest = await getExistingRequest(session, id, repo);

  if (existingRequest.status === "MATCHED" || existingRequest.status === "COMPLETED" || !!existingRequest.provisionalUntil) {
    throw new SwapRequestConflictError("Não é possível eliminar um pedido que possui matches associados.");
  }

  await repo.remove(id);
}
