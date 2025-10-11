"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";

import { Button } from "@/lib/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/lib/components/ui/form";
import { Input } from "@/lib/components/ui/input";
import { resetPasswordSchema } from "@/schemas/authSchema";

function ResetPasswordContent() {
  const formSchema = resetPasswordSchema;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  
  const token = searchParams.get('token');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (token) {
      // Validate token on page load
      validateToken(token);
      form.setValue('token', token);
    } else {
      setTokenValid(false);
    }
  }, [token, form]);

  const validateToken = async (resetToken: string) => {
    try {
      const res = await fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: resetToken }),
      });

      setTokenValid(res.ok);
      
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Token inválido ou expirado");
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setTokenValid(false);
      toast.error("Erro ao validar token");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password alterada com sucesso!");
        router.push("/login?message=password_reset");
      } else {
        toast.error(data.error || "Erro ao alterar password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Erro inesperado ao alterar password");
    } finally {
      setIsLoading(false);
    }
  }

  if (tokenValid === null) {
    return (
      <div className="w-full space-y-4 px-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A validar token...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="w-full space-y-4 px-6 py-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold">Token inválido</h2>
          <p className="text-gray-600">
            O link de recuperação é inválido ou expirou. 
            Por favor, solicita um novo link de recuperação.
          </p>
          <div className="flex flex-col gap-y-2 pt-4">
            <Link href="/forgot-password">
              <Button className="w-full">
                Solicitar novo link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Voltar ao login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-2 px-6 py-8"
      >
        <h2 className="pb-4 text-2xl font-bold">Nova password</h2>
        <p className="text-gray-600 pb-4">
          Introduz a tua nova password. Certifica-te que é segura!
        </p>
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova password</FormLabel>
              <FormControl>
                <Input placeholder="Nova password..." type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar password</FormLabel>
              <FormControl>
                <Input placeholder="Confirmar password..." type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col gap-y-2">
          <Button className="mt-8" type="submit" disabled={isLoading}>
            {isLoading ? "A alterar..." : "Alterar password"}
          </Button>
          <Link className="text-sm underline" href="/login">
            Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
}

const ResetPassword: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPassword;