import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export async function GET() {
  const issuer = env.AUTH_ISSUER_URL?.replace(/\/$/, "");

  if (!issuer) {
    return NextResponse.json(
      { error: "AuthNEI is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.redirect(`${issuer}/ui/console/users/me`);
}
