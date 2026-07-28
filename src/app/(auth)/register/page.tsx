"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

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
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] p-6">
      <div className="flex flex-col space-y-2 text-center mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Criar nova conta
        </h1>
        <p className="text-sm text-muted-foreground">
          Regista-te de forma segura com o sistema central do NEI-ISEP.
        </p>
      </div>

      {!authConfigured ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-semibold">Autenticação indisponível</p>
          <p className="mt-1 opacity-90">Por favor, contacta a equipa técnica para configurar as variáveis de ambiente.</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        <Button
          className="w-full"
          onClick={handleRegister}
          disabled={isLoading || !authConfigLoaded || !authConfigured}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-r-transparent" />
              Aguarde...
            </span>
          ) : (
            "Registar com Auth NEI"
          )}
        </Button>
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground">
        Já tens uma conta?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
        >
          Entrar aqui
        </Link>
      </p>
    </div>
  );
};

export default Register;
