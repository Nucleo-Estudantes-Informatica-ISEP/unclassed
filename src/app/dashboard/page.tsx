import { redirect } from "next/navigation";
import getServerSession from "@/services/getServerSession";
import UserDashboard from "@/components/dashboard/UserDashboard";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <UserDashboard 
      userId={session.id} 
      userRole={session.role as "USER" | "ADMIN"} 
    />
  );
}
