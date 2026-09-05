import * as userRepository from "@/application/repositories/userRepository";
import { isAdmin } from "@/lib/auth-nei-roles";
import { exclude } from "@/lib/exclude";

export class ValidationError extends Error {}

type SessionLike = {
  user?: {
    id?: string | null;
    roles?: readonly string[] | string[];
    authNeiRoles?: readonly string[] | string[];
  } | null;
  error?: string | null;
} | null;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean | null;
  phone: string | null;
  emailNotifications: boolean;
  sharePhoneOnMatch: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  role: "ADMIN" | "USER";
  roles: readonly string[];
};

export async function resolveSessionUser(
  session: SessionLike
): Promise<SessionUser | null> {
  if (!session?.user?.id || session.error) {
    return null;
  }

  const user = await userRepository.findById(session.user.id);

  if (!user) {
    return null;
  }

  const safeUser = exclude(user, [
    "password",
    "verificationToken",
    "verificationTokenExpiry",
  ]);

  const explicitRoles = Array.isArray(session.user.roles)
    ? session.user.roles.filter((role): role is string => typeof role === "string")
    : [];
  const derivedRoles = Array.isArray(session.user.authNeiRoles)
    ? session.user.authNeiRoles.filter((role): role is string => typeof role === "string")
    : [];
  const roles = explicitRoles.length > 0 ? explicitRoles : derivedRoles;

  return {
    ...safeUser,
    name: safeUser.name ?? "",
    email: safeUser.email ?? "",
    roles,
    role: isAdmin(session.user) ? "ADMIN" : "USER",
  } as SessionUser;
}

export async function findUsersByIds(userIds: string[]) {
  return userRepository.findManyByIds(userIds);
}

export async function getPreferences(userId: string) {
  return userRepository.findPreferencesById(userId);
}

export async function updatePreferences(
  userId: string,
  updateData: Record<string, unknown>
) {
  const validatedData: Record<string, unknown> = {};

  if (updateData.emailNotifications !== undefined) {
    if (typeof updateData.emailNotifications !== "boolean") {
      throw new ValidationError("emailNotifications deve ser um valor booleano");
    }
    validatedData.emailNotifications = updateData.emailNotifications;
  }

  if (updateData.sharePhoneOnMatch !== undefined) {
    if (typeof updateData.sharePhoneOnMatch !== "boolean") {
      throw new ValidationError("sharePhoneOnMatch deve ser um valor booleano");
    }
    validatedData.sharePhoneOnMatch = updateData.sharePhoneOnMatch;
  }

  if (updateData.phone !== undefined) {
    const phoneValue = updateData.phone;
    if (phoneValue !== null && typeof phoneValue !== "string") {
      throw new ValidationError("phone deve ser texto ou null");
    }

    const trimmedPhone = (phoneValue ?? "").trim() || null;
    const isValidPhone =
      trimmedPhone === null || /^9[1236]\d{7}$/.test(trimmedPhone);

    if (!isValidPhone) {
      throw new ValidationError("Número de telemóvel inválido");
    }

    validatedData.phone = trimmedPhone;
  }

  return userRepository.updatePreferences(userId, validatedData);
}

export async function markOnboardingComplete(userId: string) {
  return userRepository.markOnboardingComplete(userId);
}
