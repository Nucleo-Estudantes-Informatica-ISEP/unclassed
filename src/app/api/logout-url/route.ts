import { NextResponse } from "next/server";

import { buildLogoutCallbackPath } from "@/lib/zitadel";

export async function GET() {
  try {
    const redirectTo = await buildLogoutCallbackPath();

    return NextResponse.json({ redirectTo });
  } catch (error) {
    console.error("Failed to build logout URL:", error);
    return NextResponse.json({ redirectTo: "/" });
  }
}
