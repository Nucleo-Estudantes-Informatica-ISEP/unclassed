import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildLogoutCallbackPath } from "@/lib/zitadel";

export async function GET() {
  const session = await auth();
  const redirectTo = await buildLogoutCallbackPath(session?.idToken);

  return NextResponse.json({ redirectTo });
}
