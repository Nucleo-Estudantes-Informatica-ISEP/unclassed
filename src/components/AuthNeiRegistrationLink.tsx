"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  callbackUrl?: string;
};

export default function AuthNeiRegistrationLink({
  callbackUrl,
  ...props
}: Props) {
  const [pending, setPending] = useState(false);
  const href = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  async function startRegistration(event: { preventDefault(): void }) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    try {
      const result = await signIn(
        "zitadel",
        { callbackUrl: callbackUrl || "/profile", redirect: false },
        { prompt: "create" }
      );
      window.location.assign(result?.ok && result.url ? result.url : href);
    } catch {
      window.location.assign(href);
    }
  }

  return (
    <Link
      {...props}
      href={href}
      onNavigate={startRegistration}
      aria-busy={pending}
    />
  );
}
