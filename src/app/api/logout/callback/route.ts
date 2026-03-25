import { NextRequest, NextResponse } from "next/server";

import { resolveSafeLogoutTarget } from "@/lib/zitadel";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  return NextResponse.redirect(resolveSafeLogoutTarget(target));
}
