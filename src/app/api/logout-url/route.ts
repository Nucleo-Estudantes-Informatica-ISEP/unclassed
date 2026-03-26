import { NextResponse } from "next/server";

import { buildLogoutCallbackPath } from "@/lib/zitadel";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    const redirectTo = await buildLogoutCallbackPath(session?.idToken);

    return NextResponse.json({ redirectTo });
  } catch (error) {
    console.error("Failed to build logout URL:", error);
    return NextResponse.json({ redirectTo: "/" });
  }
}
