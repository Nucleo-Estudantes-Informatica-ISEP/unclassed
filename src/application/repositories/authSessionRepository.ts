import type { AuthSession, Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export function create(data: Prisma.AuthSessionCreateInput) {
  return prisma.authSession.create({ data });
}

export function find(id: string) {
  return prisma.authSession.findUnique({ where: { id } });
}

export function claimRefresh(
  id: string,
  providerExpiresAt: Date,
  startedAt: Date
) {
  return prisma.authSession.updateMany({
    where: {
      id,
      providerExpiresAt,
      refreshStartedAt: null,
      expiresAt: { gt: startedAt },
    },
    data: { refreshStartedAt: startedAt },
  });
}

export function finishRefresh(
  id: string,
  startedAt: Date,
  data: Pick<
    AuthSession,
    "encryptedRefreshToken" | "roles" | "providerExpiresAt"
  >
) {
  return prisma.authSession.updateMany({
    where: { id, refreshStartedAt: startedAt, expiresAt: { gt: new Date() } },
    data: { ...data, refreshStartedAt: null },
  });
}

export async function remove(id: string) {
  try {
    return await prisma.authSession.delete({ where: { id } });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    )
      return null;
    throw error;
  }
}
