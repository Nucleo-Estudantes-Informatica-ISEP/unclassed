import { NextRequest, NextResponse } from "next/server";

import { withRequestLogContext } from "@/lib/requestLogContext";
import { resolveSafeLogoutTarget } from "@/lib/zitadel";

export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    const target = request.nextUrl.searchParams.get("target");
    return NextResponse.redirect(resolveSafeLogoutTarget(target));
  });
}
