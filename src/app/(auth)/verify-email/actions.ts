"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";

import {
  EMAIL_VERIFICATION_COOKIE,
  emailVerificationCookieOptions,
  readEmailVerificationRecovery,
} from "@/lib/email-verification-recovery";
import { signIn } from "@/auth";

export async function resumeEmailVerification() {
  const jar = await cookies();
  const state = readEmailVerificationRecovery(
    jar.get(EMAIL_VERIFICATION_COOKIE)?.value
  );
  if (!state || state.attempted) return;

  jar.set(
    EMAIL_VERIFICATION_COOKIE,
    JSON.stringify({ ...state, attempted: true }),
    emailVerificationCookieOptions(process.env.NODE_ENV === "production")
  );
  try {
    await signIn(
      "zitadel",
      { redirectTo: state.destination },
      state.hint ? { login_hint: state.hint } : {}
    );
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
  }
}
