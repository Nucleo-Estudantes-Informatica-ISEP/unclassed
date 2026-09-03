import * as userRepository from "@/application/repositories/userRepository";
import { exclude } from "@/lib/exclude";

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
    role: roles.includes("admin") ? "ADMIN" : "USER",
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
  return userRepository.updatePreferences(userId, updateData);
}

export async function markOnboardingComplete(userId: string) {
  return userRepository.markOnboardingComplete(userId);
}
