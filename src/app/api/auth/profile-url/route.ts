import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import { env } from "@/lib/env";

export const GET = defineHandler({
  auth: false,
  handler: async () => {
    const issuer = env.AUTH_ISSUER_URL?.replace(/\/$/, "");
    if (!issuer) {
      return NextResponse.json(
        { error: "AuthNEI is not configured" },
        { status: 503 }
      );
    }
    return NextResponse.redirect(`${issuer}/ui/console/users/me`);
  },
});
