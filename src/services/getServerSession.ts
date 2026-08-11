import { exclude } from "@/lib/exclude";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const getServerSession = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return null;
  }

  return exclude(user, [
    "password",
    "verificationToken",
    "verificationTokenExpiry",
  ]);
};

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>
>;

export default getServerSession;
