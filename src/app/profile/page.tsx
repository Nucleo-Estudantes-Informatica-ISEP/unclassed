import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";
import { ProfileClient } from "@/components/ProfileClient";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Get user preferences
  const user = await prisma.user.findUnique({
    where: { id: session.id },
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

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: session.role,
      }}
      preferences={{
        phone: user.phone,
        emailNotifications: user.emailNotifications,
        emailVerified: user.emailVerified,
        sharePhoneOnMatch: user.sharePhoneOnMatch,
      }}
    />
  );
}
