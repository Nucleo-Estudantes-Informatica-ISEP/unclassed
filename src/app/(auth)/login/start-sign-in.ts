"use server";

import { logger } from "@/lib/logger";
import { relativeCallbackPath } from "@/lib/relativeCallbackPath";
import { getIssuerUrl } from "@/lib/zitadel";
import { signIn } from "@/auth";

export async function startSignIn(callbackUrl: string): Promise<string | null> {
  const destination = relativeCallbackPath.safeParse(callbackUrl);
  if (!destination.success) return null;

  try {
    const issuer = new URL(getIssuerUrl());
    const target = new URL(
      await signIn("zitadel", { redirect: false, redirectTo: destination.data })
    );
    if (target.origin === issuer.origin) return target.href;
    logger.warn("AuthNEI sign-in did not return an issuer redirect");
  } catch {
    logger.warn("AuthNEI sign-in could not start");
  }
  return null;
}
