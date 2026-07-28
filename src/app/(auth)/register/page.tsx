"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, UserPlus } from "lucide-react";

import { Button } from "@/lib/components/ui/button";

const Register: React.FC = () => {
  const [authConfigLoaded, setAuthConfigLoaded] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") || searchParams.get("redirectTo") || "/profile";

  useEffect(() => {
    let mounted = true;

    const checkAuthConfig = async () => {
      try {
        const response = await fetch("/api/auth/configured", { cache: "no-store" });
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

  async function handleRegister() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await signIn("zitadel", { callbackUrl });
    } catch (error) {
      console.error("Register error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full px-6 py-12 sm:px-12 sm:py-16 min-h-[36rem]">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="size-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Criar conta</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            O registo passou para o portal oficial de autenticação do NEI. Continua no portal e
            cria lá a tua conta para regressares automaticamente ao Unclassed.
          </p>
        </div>

        {authConfigLoaded && !authConfigured ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-semibold">Autenticação indisponível</p>
            <p className="mt-1 opacity-90">Por favor, contacta a equipa técnica para configurar as variáveis de ambiente.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            onClick={handleRegister}
            size="lg"
            className="w-full shadow-md shadow-primary/20"
            disabled={isLoading || !authConfigLoaded || !authConfigured}
          >
            {isLoading ? "Aguarde..." : "Continuar para o portal"}
            {!isLoading && <ArrowRight className="size-4" />}
          </Button>
        </div>

        <div className="border-t border-border" />

        <div className="text-center text-sm">
          <Link
            className="text-primary font-medium hover:underline"
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Já tens conta? Inicia sessão
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
