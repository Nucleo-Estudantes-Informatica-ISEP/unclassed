"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/lib/components/ui/button";

const Login: React.FC = () => {
  const [authConfigLoaded, setAuthConfigLoaded] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") || searchParams.get("redirectTo") || "/dashboard";

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

  useEffect(() => {
    if (!authConfigLoaded || !authConfigured) {
      return;
    }

    void handleSignIn();
    // We intentionally want this to run once for the resolved redirect target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authConfigLoaded, authConfigured, callbackUrl]);

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
    <div className="w-full space-y-4 px-6 py-12 sm:px-12 sm:py-16">
      <h2 className="pb-2 text-2xl font-bold">Entrar no Unclassed</h2>
      <p className="text-sm text-muted-foreground">
        O login é agora feito através do sistema central de autenticação do NEI.
      </p>
      <p className="text-sm text-muted-foreground">
        Se já tinhas conta no Unclassed, usa o mesmo email em ZITADEL para ligar
        automaticamente o teu utilizador existente sem perder dados, pedidos ou permissões.
      </p>
      <p className="text-sm text-muted-foreground">
        Estamos a redirecionar-te para o login central.
      </p>

      {!authConfigured ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Auth is not configured. Contacta a equipa para configurar
          AUTH_ISSUER_URL, AUTH_CLIENT_ID, AUTH_CLIENT_SECRET e AUTH_SECRET.
        </p>
      ) : null}

      <Button
        className="mt-6 w-full"
        onClick={handleSignIn}
        disabled={isLoading || !authConfigLoaded || !authConfigured}
      >
        {isLoading ? "A redirecionar para NEI Auth..." : "Continuar com NEI Auth"}
      </Button>

      <div className="flex flex-col gap-y-2 pt-2">
        <Link className="text-sm underline" href="/register">
          Não tens conta no sistema central? Saber mais
        </Link>
      </div>
    </div>
  );
};

export default Login;
