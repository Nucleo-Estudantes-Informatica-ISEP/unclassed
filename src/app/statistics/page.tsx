import { redirect } from "next/navigation";
import getServerSession from "@/services/getServerSession";
import StatisticsClient from "./StatisticsClient";

export default async function StatisticsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <StatisticsClient />;
}
