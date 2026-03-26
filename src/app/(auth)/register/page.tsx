"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/lib/components/ui/button";

const Register: React.FC = () => {
  const [authConfigLoaded, setAuthConfigLoaded] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    void handleRegister();
    // We intentionally want this to run once after checking config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authConfigLoaded, authConfigured]);

  async function handleRegister() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("zitadel", {
        redirectTo: "/profile",
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (!result?.url) {
        throw new Error("Missing redirect URL from auth provider");
      }

      window.location.assign(result.url);
    } catch (error) {
      console.error("Register error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4 px-6 py-8">
      <h2 className="pb-2 text-2xl font-bold">Criar conta</h2>
      <p className="text-sm text-muted-foreground">
        O registo passa a ser gerido pelo sistema central de autenticação do NEI.
      </p>
      <p className="text-sm text-muted-foreground">
        Depois do primeiro login, o Unclassed cria ou liga automaticamente o teu
        utilizador local e mantém os teus dados atuais se já tinhas conta.
      </p>
      <p className="text-sm text-muted-foreground">
        Se fores um utilizador novo, entra e completa os teus dados de perfil no
        Unclassed após a autenticação.
      </p>
      <p className="text-sm text-muted-foreground">
        Estamos a redirecionar-te para o registo/login central.
      </p>

      {!authConfigured ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Auth is not configured. Contacta a equipa para configurar
          AUTH_ISSUER_URL, AUTH_CLIENT_ID, AUTH_CLIENT_SECRET e AUTH_SECRET.
        </p>
      ) : null}

      <Button
        className="mt-6 w-full"
        onClick={handleRegister}
        disabled={isLoading || !authConfigLoaded || !authConfigured}
      >
        {isLoading ? "A redirecionar para NEI Auth..." : "Continuar com NEI Auth"}
      </Button>

      <div className="flex flex-col gap-y-2 pt-2">
        <Link className="text-sm underline" href="/login">
          Já tens conta no sistema central? Entrar
        </Link>
      </div>
    </div>
  );
};

export default Register;
