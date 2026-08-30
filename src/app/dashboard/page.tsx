import { redirect } from "next/navigation";
import AdvancedMatchingDashboard from "@/components/admin/AdvancedMatchingDashboard";
import UserDashboard from "@/components/dashboard/UserDashboard";
import getServerSession from "@/services/getServerSession";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <UserDashboard
      userId={session.id}
      userRole={session.role as "USER" | "ADMIN"}
      adminDashboard={
        session.role === "ADMIN" ? <AdvancedMatchingDashboard /> : undefined
      }
    />
  );
}
