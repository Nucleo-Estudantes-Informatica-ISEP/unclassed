import prisma from "@/lib/prisma";

const userPreferenceSelect = {
  phone: true,
  emailNotifications: true,
  emailVerified: true,
  sharePhoneOnMatch: true,
  name: true,
  email: true,
} as const;

export async function findFirst(args?: Parameters<typeof prisma.user.findFirst>[0]) {
  return prisma.user.findFirst(args);
}

export async function findMany(args?: Parameters<typeof prisma.user.findMany>[0]) {
  return prisma.user.findMany(args ?? {});
}

export async function findManyByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
}

export async function findById(id: string, select?: Parameters<typeof prisma.user.findUnique>[0]["select"]) {
  return prisma.user.findUnique({
    where: { id },
    ...(select ? { select } : {}),
  });
}

export async function findProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      emailVerified: true,
      emailNotifications: true,
      sharePhoneOnMatch: true,
    },
  });
}

export async function findPreferencesById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      emailNotifications: true,
      emailVerified: true,
      sharePhoneOnMatch: true,
    },
  });
}

export async function updatePreferences(userId: string, updateData: Record<string, unknown>) {
  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userPreferenceSelect,
  });
}

export async function markOnboardingComplete(userId: string) {
  return prisma.user.updateMany({
    where: { id: userId, onboardingCompletedAt: null },
    data: { onboardingCompletedAt: new Date() },
  });
}

export async function upsert(args: Parameters<typeof prisma.user.upsert>[0]) {
  return prisma.user.upsert(args);
}

export async function create(args: Parameters<typeof prisma.user.create>[0]) {
  return prisma.user.create(args);
}

export async function update(args: Parameters<typeof prisma.user.update>[0]) {
  return prisma.user.update(args);
}

export async function updateMany(args: Parameters<typeof prisma.user.updateMany>[0]) {
  return prisma.user.updateMany(args);
}

export async function deleteMany(args: Parameters<typeof prisma.user.deleteMany>[0]) {
  return prisma.user.deleteMany(args);
}

