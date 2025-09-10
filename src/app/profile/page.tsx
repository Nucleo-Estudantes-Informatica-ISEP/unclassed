import { redirect } from 'next/navigation';
import getServerSession from '@/services/getServerSession';
import { ProfileClient } from '@/components/ProfileClient';
import prisma from '@/lib/prisma';

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Get user preferences
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      emailNotifications: true,
      sharePhoneOnMatch: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <ProfileClient 
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }}
      preferences={{
        emailNotifications: user.emailNotifications,
        emailVerified: user.emailVerified,
        sharePhoneOnMatch: user.sharePhoneOnMatch
      }}
    />
  );
}
