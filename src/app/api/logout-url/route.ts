import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { buildLogoutCallbackPath } from "@/lib/zitadel";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    const idTokenHint =
      typeof token?.idTokenHint === "string" ? token.idTokenHint : null;
    const redirectTo = await buildLogoutCallbackPath(idTokenHint);

    return NextResponse.json({ redirectTo });
  } catch (error) {
    console.error("Failed to build logout URL:", error);
    return NextResponse.json({ redirectTo: "/" });
  }
}
