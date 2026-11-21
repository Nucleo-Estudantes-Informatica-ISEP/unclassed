"use server";

import { logger } from "@/lib/logger";
import { getIssuerUrl } from "@/lib/zitadel";
import { signIn } from "@/auth";

export async function startSignIn(callbackUrl: string): Promise<string | null> {
  try {
    const issuer = new URL(getIssuerUrl());
    const target = new URL(
      await signIn("zitadel", { redirect: false, redirectTo: callbackUrl })
    );
    if (target.origin === issuer.origin) return target.href;
    logger.warn("AuthNEI sign-in did not return an issuer redirect");
  } catch {
    logger.warn("AuthNEI sign-in could not start");
  }
  return null;
}
