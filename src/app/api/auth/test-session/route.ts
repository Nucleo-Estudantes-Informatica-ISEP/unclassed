import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import * as userRepo from "@/application/repositories/userRepository";
import { env } from "@/lib/env";

function secretsMatch(expected: string, actual: string): boolean {
  // Hash both sides to fixed-length (32-byte) digests so timingSafeEqual never
  // truncates long inputs — a truncation bug would let an attacker authenticate
  // with a value that shares only the first N bytes with the real secret.
  const a = createHash("sha256").update(expected, "utf8").digest();
  const b = createHash("sha256").update(actual, "utf8").digest();
  return timingSafeEqual(a, b);
}

function checkSecret(request: NextRequest): boolean {
  // NODE_ENV is "development" when the app runs via `next dev` (CI) and
  // "production" in every production deployment — this is a structural boundary.
  if (env.NODE_ENV === "production") return false;
  const e2eSecret = env.E2E_TEST_SECRET;
  if (!e2eSecret) return false;
  return secretsMatch(e2eSecret, request.headers.get("x-e2e-secret") ?? "");
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!env.AUTH_SECRET) {
    console.error("[test-session] AUTH_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const rawRole = request.nextUrl.searchParams.get("role");
  const role = rawRole === "ADMIN" ? "ADMIN" : "USER";

  const id = randomUUID();
  const user = await userRepo.create({
    data: {
      name: `E2E User ${id}`,
      email: `e2e_${id}@example.test`,
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
    secret: env.AUTH_SECRET,
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

export async function DELETE(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await userRepo.deleteMany({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
