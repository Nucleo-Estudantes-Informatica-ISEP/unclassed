"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
import { loginSchema } from "@/schemas/authSchema";

const Login: React.FC = () => {
  const formSchema = loginSchema;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'email_verified') {
      toast.success('✅ Email verificado com sucesso! Já podes fazer login.');
    } else if (message === 'already_verified') {
      toast.info('ℹ️ Email já estava verificado. Podes fazer login.');
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      console.log("Submitting login:", { email: values.email }); // Debug log
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      console.log("Login response:", { status: res.status, data }); // Debug log

      if (res.ok) {
        toast.success("Login realizado com sucesso!");
        console.log("Redirecting to home..."); // Debug log
        // Force a full page refresh to ensure cookie is set
        window.location.href = "/";
      } else {
        toast.error(data.error || "Erro ao fazer login");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-2 px-6 py-8"
      >
        <h2 className="pb-4 text-2xl font-bold">Entra na tua conta!</h2>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="Password..." type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-y-2">
          <Button className="mt-8" type="submit" disabled={isLoading}>
            {isLoading ? "A entrar..." : "Entrar"}
          </Button>
          <Link className="text-sm underline" href="/register">
            Ainda não tens conta? Regista-te!
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default Login;
