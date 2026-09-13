import type { BundleSwapRequest } from "@/application/repositories/bundleSwapRequestRepository";
import type { Class } from "@/application/repositories/classRepository";
import type { SingleSwapRequest } from "@/application/repositories/singleSwapRequestRepository";
import type { Subject } from "@/application/repositories/subjectRepository";
import type { User } from "@/application/repositories/userRepository";

type PublicUser = Pick<User, "id" | "name" | "email">;
type PublicClass = Pick<Class, "id" | "name" | "year">;
type PublicSubject = Pick<Subject, "id" | "code" | "name" | "year">;

type SingleSwapRequestRecord = SingleSwapRequest & {
  user?: PublicUser | null;
  subject?: PublicSubject | null;
  currentClass?: PublicClass | null;
};

type BundleSwapRequestRecord = BundleSwapRequest & {
  user?: PublicUser | null;
  currentClass?: PublicClass | null;
};

export type SingleSwapRequestDto = ReturnType<typeof toSingleSwapRequestDto>;

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
