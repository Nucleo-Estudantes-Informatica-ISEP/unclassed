import { redirect } from "next/navigation";
import getServerSession from "@/services/getServerSession";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <RequestsClient userId={session.id} />;
}
