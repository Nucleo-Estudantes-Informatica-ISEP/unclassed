import { NextResponse } from "next/server";

import { isAuthConfigured } from "@/lib/auth-config";
import { defineHandler } from "@/lib/defineHandler";

export const GET = defineHandler({
  auth: false,
  handler: async () => {
    return NextResponse.json({
      configured: isAuthConfigured(),
    });
  },
});
