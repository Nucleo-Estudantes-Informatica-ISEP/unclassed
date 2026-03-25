"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/lib/components/ui/button";

const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void handleRegister();
  }, []);

  async function handleRegister() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await signIn("zitadel", { redirectTo: "/profile" });
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

      <Button className="mt-6 w-full" onClick={handleRegister} disabled={isLoading}>
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
