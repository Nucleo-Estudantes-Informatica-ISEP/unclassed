"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/lib/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <AlertCircle className="mx-auto mb-4 size-16 text-amber-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Verificação movida para o NEI Auth
          </h1>
          <p className="mb-6 text-gray-600">
            A verificação de email já não é feita dentro do Unclassed. Usa o
            sistema central de autenticação para verificar a conta e depois
            volta a entrar com o mesmo email.
          </p>

          <Button
            onClick={() => router.push("/login")}
            className="w-full"
            size="lg"
          >
            Ir para o login
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          🎓 Uma iniciativa do{" "}
          <span className="font-semibold text-blue-600">NEI-ISEP</span>
        </p>
      </div>
    </div>
  );
}
