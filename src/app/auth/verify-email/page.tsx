"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/lib/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] =
    useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = searchParams.get("token");

  const verifyEmail = async () => {
    if (isLoading) {
      return;
    }

    if (!token) {
      setError("Token de verificação não encontrado");
      return;
    }

    setHasAttemptedVerification(true);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Erro ao verificar email");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="rounded-lg bg-white p-8 shadow-md">
            <XCircle className="mx-auto mb-4 size-16 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Erro na verificação
            </h1>
            <p className="mb-6 text-red-600">
              Token de verificação não encontrado
            </p>

            <Button
              onClick={() => router.push("/login")}
              className="w-full"
              size="lg"
            >
              Voltar ao login
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="rounded-lg bg-white p-8 shadow-md">
          {success ? (
            <>
              <CheckCircle2 className="mx-auto mb-4 size-16 text-green-500" />
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Email verificado
              </h1>
              <p className="mb-6 text-gray-600">
                A tua conta foi ativada com sucesso!
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Confirmação de email
              </h1>
              {hasAttemptedVerification && error ? (
                <>
                  <XCircle className="mx-auto mb-4 size-16 text-red-500" />
                  <p className="mb-6 text-red-600">{error}</p>
                </>
              ) : (
                <p className="mb-6 text-gray-600">
                  Clica no botão abaixo para confirmar e ativar a tua conta.
                </p>
              )}
            </>
          )}

          {success ? (
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
              size="lg"
            >
              Voltar ao login
            </Button>
          ) : (
            <Button
              onClick={verifyEmail}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "A carregar..." : "Verificar email"}
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500">
          🎓 Uma iniciativa do{" "}
          <span className="font-semibold text-blue-600">NEI-ISEP</span>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>A carregar...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
