import { NextResponse } from "next/server";

import { isAuthConfigured } from "@/lib/auth-config";

export async function GET() {
  return NextResponse.json({
    configured: isAuthConfigured(),
  });
}
