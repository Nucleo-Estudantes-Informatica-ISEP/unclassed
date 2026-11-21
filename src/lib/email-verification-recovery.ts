export const EMAIL_VERIFICATION_COOKIE = "authnei-email-verification";
export const EMAIL_VERIFICATION_MAX_AGE = 300;

type Recovery = {
  hint: string;
  destination: string;
  attempted: boolean;
};

export function appReturnPath(value?: string) {
  if (!value || value.includes("\\")) return "/dashboard";
  try {
    const url = new URL(value, "http://local.invalid");
    const path = url.pathname;
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      /^\/(?:api|login|register|verify-email)(?:\/|$)/i.test(path)
    ) {
      return "/dashboard";
    }
    return path + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}

export function readEmailVerificationRecovery(raw?: string): Recovery | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Recovery> | null;
    if (
      !value ||
      typeof value.hint !== "string" ||
      value.hint.length === 0 ||
      value.hint.length > 320 ||
      typeof value.destination !== "string" ||
      typeof value.attempted !== "boolean"
    ) {
      return null;
    }
    return { hint: value.hint, destination: appReturnPath(value.destination), attempted: value.attempted };
  } catch {
    return null;
  }
}

export function emailVerificationCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: EMAIL_VERIFICATION_MAX_AGE };
}
