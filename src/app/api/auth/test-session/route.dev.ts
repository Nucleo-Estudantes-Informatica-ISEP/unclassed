import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { z } from "zod";

import { env } from "@/lib/env";
import { isFixtureDatabase } from "@/lib/fixtureDatabase";
import * as userRepo from "@/application/repositories/userRepository";

const fixtureEmailPrefix = "e2e_";
const fixtureEmailSuffix = "@example.test";
const cleanupSchema = z.object({ userId: z.string().regex(/^[a-f0-9]{24}$/i) });

function secretsMatch(expected: string, actual: string): boolean {
  // Hash both sides to fixed-length (32-byte) digests so timingSafeEqual never
  // truncates long inputs — a truncation bug would let an attacker authenticate
  // with a value that shares only the first N bytes with the real secret.
  const a = createHash("sha256").update(expected, "utf8").digest();
  const b = createHash("sha256").update(actual, "utf8").digest();
  return timingSafeEqual(a, b);
}

function checkSecret(request: NextRequest): boolean {
  if (!isFixtureDatabase()) return false;
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
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const rawRole = request.nextUrl.searchParams.get("role");
  const role = rawRole === "ADMIN" ? "ADMIN" : "USER";

  const id = randomUUID();
  const user = await userRepo.create({
    data: {
      name: `E2E User ${id}`,
      email: `${fixtureEmailPrefix}${id}${fixtureEmailSuffix}`,
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
      fixtureSession: true,
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

  const input = cleanupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await userRepo.deleteMany({
    where: {
      id: input.data.userId,
      email: { startsWith: fixtureEmailPrefix, endsWith: fixtureEmailSuffix },
    },
  });
  return NextResponse.json({ ok: true });
}
