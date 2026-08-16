import { redirect } from "next/navigation";
import getServerSession from "@/services/getServerSession";
import SwapRequestsClient from "./SwapRequestsClient";

export default async function SwapRequestsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <SwapRequestsClient
      currentUserId={session.id}
      initialGuidanceMode={
        session.onboardingCompletedAt === null ? "guided" : "basic"
      }
    />
  );
}
