import { redirect } from "next/navigation";

import * as userRepository from "@/application/repositories/userRepository";
import getServerSession from "@/services/getServerSession";
import { ProfileClient } from "@/components/ProfileClient";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Get user preferences
  const user = await userRepository.findProfileById(session.id);

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
