"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { httpClient } from "@/lib/httpClient";

import { startSignIn } from "./start-sign-in";

async function checkAuthConfiguration() {
  const { configured } = await httpClient.get<{ configured: boolean }>(
    "/api/auth/configured",
    { cache: "no-store" }
  );
  return configured;
}

const Login: React.FC = () => {
  const [status, setStatus] = useState<
    "checking" | "ready" | "starting" | "unavailable"
  >("checking");
  const [showSupport, setShowSupport] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ||
    searchParams.get("redirectTo") ||
    "/dashboard";

  useEffect(() => {
    let mounted = true;

    const checkAuthConfig = async () => {
      try {
        const configured = await checkAuthConfiguration();
        if (mounted) setStatus(configured ? "ready" : "unavailable");
      } catch {
        if (mounted) setStatus("unavailable");
      }
    };

    const restoreSignIn = () => {
      setStatus((current) => (current === "starting" ? "ready" : current));
    };

    window.addEventListener("pageshow", restoreSignIn);
    void checkAuthConfig();

    return () => {
      mounted = false;
      window.removeEventListener("pageshow", restoreSignIn);
    };
  }, []);

  async function handleSignIn(retry: boolean) {
    setStatus("starting");

    try {
      if (!retry || (await checkAuthConfiguration())) {
        const target = await startSignIn(callbackUrl);
        if (target) {
          window.location.assign(target);
          return;
        }
      }
    } catch {
      // The same retry action works for transient network failures.
    }
    setStatus("unavailable");
    setShowSupport(retry);
  }

  return (
    <div className="flex min-h-[36rem] w-full flex-col items-center justify-center px-6 py-12 sm:px-12 sm:py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3">
          <div className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-2xl">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            O Unclassed usa o portal de autenticação do NEI. O login, registo e
            recuperação de palavra-passe acontecem todos na página oficial.
          </p>
        </div>

        {status === "unavailable" ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
          >
            <p className="font-semibold">
              O início de sessão está temporariamente indisponível.
            </p>
            {showSupport && (
              <a
                className="mt-1 inline-block underline"
                href="mailto:info@nei-isep.org"
              >
                Contactar o apoio do NEI
              </a>
            )}
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            onClick={() => handleSignIn(status === "unavailable")}
            size="lg"
            className="shadow-primary/20 w-full shadow-md"
            disabled={status === "checking" || status === "starting"}
          >
            {status === "starting"
              ? "A iniciar sessão…"
              : status === "unavailable"
                ? "Tentar novamente"
                : "Continuar para o login"}
            {status === "ready" && <ArrowRight className="size-4" />}
          </Button>
        </div>

        <div className="border-border border-t" />

        <div className="space-y-3 text-center text-sm">
          <Link
            className="text-primary block font-medium hover:underline"
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Ainda não tens conta? Cria uma agora
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
