"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";

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
import { forgotPasswordSchema } from "@/schemas/authSchema";

const ForgotPassword: React.FC = () => {
  const formSchema = forgotPasswordSchema;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailSent(true);
        toast.success("Email de recuperação enviado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao enviar email de recuperação");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Erro inesperado ao enviar email");
    } finally {
      setIsLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="w-full space-y-4 px-6 py-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">📧</div>
          <h2 className="text-2xl font-bold">Email enviado!</h2>
          <p className="text-gray-600">
            Enviámos um link de recuperação para o teu email. 
            Verifica a tua caixa de entrada e segue as instruções.
          </p>
          <p className="text-sm text-gray-500">
            O link expira em 1 hora por motivos de segurança.
          </p>
          <div className="flex flex-col gap-y-2 pt-4">
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
        <h2 className="pb-4 text-2xl font-bold">Recuperar password</h2>
        <p className="text-gray-600 pb-4">
          Introduz o teu email e enviaremos um link para recuperares a tua password.
        </p>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="O teu email..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col gap-y-2">
          <Button className="mt-8" type="submit" disabled={isLoading}>
            {isLoading ? "A enviar..." : "Enviar link de recuperação"}
          </Button>
          <Link className="text-sm underline" href="/login">
            Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default ForgotPassword;