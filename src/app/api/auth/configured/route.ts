import { NextResponse } from "next/server";

import { getMissingAuthEnvVars, isAuthConfigured } from "@/lib/auth-config";

export async function GET() {
  const configured = isAuthConfigured();

  return NextResponse.json({
    configured,
    missing: configured ? [] : getMissingAuthEnvVars(),
  });
}
