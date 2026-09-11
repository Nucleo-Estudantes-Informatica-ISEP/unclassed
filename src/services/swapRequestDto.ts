import type {
  BundleSwapRequest,
  Class,
  SingleSwapRequest,
  Subject,
  User,
} from "@prisma/client";

type PublicUser = Pick<User, "id" | "name" | "email">;
type PublicClass = Pick<Class, "id" | "name" | "year">;
type PublicSubject = Pick<Subject, "id" | "code" | "name" | "year">;

type SingleSwapRequestRecord = SingleSwapRequest & {
  user?: PublicUser;
  subject?: PublicSubject;
  currentClass?: PublicClass;
};

type BundleSwapRequestRecord = BundleSwapRequest & {
  user?: PublicUser;
  currentClass?: PublicClass;
};

export function toSingleSwapRequestDto(
  request: SingleSwapRequestRecord,
  preferredClasses: PublicClass[]
) {
  return {
    id: request.id,
    userId: request.userId,
    subjectId: request.subjectId,
    currentClassId: request.currentClassId,
    preferredClassIds: request.preferredClassIds,
    preferenceOrderMatters: request.preferenceOrderMatters,
    ticketType: request.ticketType,
    status: request.status,
    priority: request.priority,
    satisfactionScore: request.satisfactionScore,
    provisionalUntil: request.provisionalUntil,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    user: request.user,
    subject: request.subject,
    currentClass: request.currentClass,
    preferredClasses,
  };
}

export function toBundleSwapRequestDto(
  request: BundleSwapRequestRecord,
  preferredClasses: PublicClass[]
) {
  return {
    id: request.id,
    userId: request.userId,
    currentClassId: request.currentClassId,
    preferredClassIds: request.preferredClassIds,
    preferenceOrderMatters: request.preferenceOrderMatters,
    ticketType: request.ticketType,
    status: request.status,
    priority: request.priority,
    satisfactionScore: request.satisfactionScore,
    provisionalUntil: request.provisionalUntil,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    user: request.user,
    currentClass: request.currentClass,
    preferredClasses,
  };
}
