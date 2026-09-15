import prisma from "@/lib/prisma";

export async function findUnique(args: Parameters<typeof prisma.matchNotificationDelivery.findUnique>[0]) {
  return prisma.matchNotificationDelivery.findUnique(args);
}

export async function create(args: Parameters<typeof prisma.matchNotificationDelivery.create>[0]) {
  return prisma.matchNotificationDelivery.create(args);
}

export async function updateMany(args: Parameters<typeof prisma.matchNotificationDelivery.updateMany>[0]) {
  return prisma.matchNotificationDelivery.updateMany(args);
}
