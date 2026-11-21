"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { relativeCallbackPath } from "@/lib/relativeCallbackPath";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  callbackUrl?: string;
};

export default function AuthNeiRegistrationLink({
  callbackUrl,
  ...props
}: Props) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const destination = relativeCallbackPath.safeParse(callbackUrl);
  const href = destination.success
    ? `/register?callbackUrl=${encodeURIComponent(destination.data)}`
    : "/register";

  async function startRegistration(event: { preventDefault(): void }) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFailed(false);

    try {
      const result = await signIn(
        "zitadel",
        {
          callbackUrl: destination.success ? destination.data : "/profile",
          redirect: false,
        },
        { prompt: "create" }
      );
      if (result?.ok && result.url && !result.error) {
        window.location.assign(result.url);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Link
        {...props}
        href={href}
        onNavigate={startRegistration}
        aria-busy={pending}
      />
      {failed && (
        <span role="alert" className="text-destructive block text-sm">
          Não foi possível iniciar o registo com o AuthNEI. Tenta novamente.
        </span>
      )}
    </>
  );
}
