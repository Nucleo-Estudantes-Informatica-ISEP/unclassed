import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import { buildZitadelLogoutUrl } from "@/lib/zitadel";

export const GET = defineHandler({
  auth: false,
  handler: () => NextResponse.json({ redirectTo: buildZitadelLogoutUrl() }),
});
