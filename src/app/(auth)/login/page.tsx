"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/lib/components/ui/button";

const Login: React.FC = () => {
  const [authConfigLoaded, setAuthConfigLoaded] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ||
    searchParams.get("redirectTo") ||
    "/dashboard";

  useEffect(() => {
    let mounted = true;

    const checkAuthConfig = async () => {
      try {
        const response = await fetch("/api/auth/configured", {
          cache: "no-store",
        });
        const data = (await response.json()) as { configured?: boolean };

        if (mounted) {
          setAuthConfigured(data.configured !== false);
          setAuthConfigLoaded(true);
        }
      } catch {
        if (mounted) {
          setAuthConfigured(false);
          setAuthConfigLoaded(true);
        }
      }
    };

    void checkAuthConfig();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignIn() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await signIn("zitadel", { callbackUrl });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
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

        {authConfigLoaded && !authConfigured ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
            <p className="font-semibold">Autenticação indisponível</p>
            <p className="mt-1 opacity-90">
              Por favor, contacta a equipa técnica para configurar as variáveis
              de ambiente.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            onClick={handleSignIn}
            size="lg"
            className="shadow-primary/20 w-full shadow-md"
            disabled={isLoading || !authConfigLoaded || !authConfigured}
          >
            {isLoading ? "Aguarde..." : "Continuar para o login"}
            {!isLoading && <ArrowRight className="size-4" />}
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
