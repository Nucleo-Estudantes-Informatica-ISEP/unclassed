import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import * as userRepo from "@/application/repositories/userRepository";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const e2eSecret = env.E2E_TEST_SECRET;
  if (!e2eSecret || request.headers.get("x-e2e-secret") !== e2eSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawRole = request.nextUrl.searchParams.get("role");
  const role = rawRole === "ADMIN" ? "ADMIN" : "USER";

  const suffix = Date.now();
  const user = await userRepo.create({
    data: {
      name: `E2E User ${suffix}`,
      email: `e2e_${suffix}@example.test`,
      role,
    },
  });

  const authNeiRoles = role === "ADMIN" ? ["admin"] : [];
  const isSecure = request.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      localUserId: user.id,
      role,
      authNeiRoles,
      zitadelSub: `e2e-${user.id}`,
      accessToken: "e2e-test-token",
      // Far-future expiry prevents the jwt() callback from attempting a Zitadel token refresh
      accessTokenExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    },
    secret: env.AUTH_SECRET!,
    salt: cookieName,
  });

  const response = NextResponse.json({ userId: user.id, role });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });

  return response;
}
