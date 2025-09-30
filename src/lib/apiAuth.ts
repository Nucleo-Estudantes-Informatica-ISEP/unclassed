import { NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";

export async function requireAdmin() {
  const session = await getServerSession();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
