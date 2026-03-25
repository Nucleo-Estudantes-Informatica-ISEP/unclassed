"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/lib/components/ui/button";

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  useEffect(() => {
    void handleSignIn();
    // We intentionally want this to run once for the resolved redirect target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo]);

  async function handleSignIn() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await signIn("zitadel", { redirectTo });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 px-6 py-8">
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

      <Button className="mt-6 w-full" onClick={handleSignIn} disabled={isLoading}>
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
