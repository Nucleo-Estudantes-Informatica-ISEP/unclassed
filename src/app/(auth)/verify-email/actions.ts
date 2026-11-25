"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  EMAIL_VERIFICATION_COOKIE,
  emailVerificationCookieOptions,
  readEmailVerificationRecovery,
} from "@/lib/email-verification-recovery";
import { getIssuerUrl } from "@/lib/zitadel";
import { signIn } from "@/auth";

export async function resumeEmailVerification(): Promise<boolean> {
  const jar = await cookies();
  const state = readEmailVerificationRecovery(
    jar.get(EMAIL_VERIFICATION_COOKIE)?.value
  );
  if (!state || state.attempted) return true;

  let target: URL;
  try {
    const issuer = new URL(getIssuerUrl());
    target = new URL(
      await signIn(
        "zitadel",
        { redirect: false, redirectTo: state.destination },
        state.hint ? { login_hint: state.hint } : {}
      )
    );
    if (target.origin !== issuer.origin) return true;
  } catch {
    return true;
  }

  jar.set(
    EMAIL_VERIFICATION_COOKIE,
    JSON.stringify({ ...state, attempted: true }),
    emailVerificationCookieOptions(process.env.NODE_ENV === "production")
  );
  redirect(target.href);
}
