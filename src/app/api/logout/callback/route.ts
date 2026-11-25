import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import { resolveSafeLogoutTarget } from "@/lib/zitadel";

export const GET = defineHandler({
  auth: false,
  handler: async (context) => {
    const { request } = context;
    const target = request.nextUrl.searchParams.get("target");
    return NextResponse.redirect(resolveSafeLogoutTarget(target));
  },
});
