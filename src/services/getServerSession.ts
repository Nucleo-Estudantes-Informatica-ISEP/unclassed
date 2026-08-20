import { isAdmin } from "@/lib/auth-nei-roles";
import { exclude } from "@/lib/exclude";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const getServerSession = async () => {
  const session = await auth();

  if (!session?.user?.id || session.error) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return null;
  }

  const safeUser = exclude(user, [
    "password",
    "verificationToken",
    "verificationTokenExpiry",
  ]);

  return {
    ...safeUser,
    roles: session.user.roles,
    // Compatibility projection only. AuthNEI remains the source of truth for admin.
    role: isAdmin(session.user) ? ("ADMIN" as const) : ("USER" as const),
  };
};

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>
>;

export default getServerSession;
