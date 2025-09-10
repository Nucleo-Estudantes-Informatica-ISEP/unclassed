"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/lib/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/lib/components/ui/form";
import { Input } from "@/lib/components/ui/input";
import { Checkbox } from "@/lib/components/ui/checkbox";
import { registerSchema } from "@/schemas/authSchema";

const Register: React.FC = () => {
  const formSchema = registerSchema;
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      sharePhoneOnMatch: false,
    },
    mode: "onChange",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.message) {
          toast.success(data.message);
        } else {
          toast.success("Conta criada com sucesso! Verifica o teu email para ativar a conta.");
        }
        router.push("/login");
      } else {
        toast.error(data.error || "Erro ao criar conta");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Erro inesperado ao criar conta");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2 px-6 py-8"
      >
        <h2 className="pb-4 text-2xl font-bold">Criar conta</h2>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome..." {...field} />
              </FormControl>
              <FormDescription>
                O teu nome será mostrado a quem te quiser contactar.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email..." {...field} />
              </FormControl>
              <FormDescription>
                O teu email vai servir para os outros alunos te poderem
                contactar.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de telemóvel</FormLabel>
              <FormControl>
                <Input placeholder="Número de telemóvel..." {...field} />
              </FormControl>
              <FormDescription>
                O teu telemóvel vai servir para os outros alunos te poderem
                contactar.
              </FormDescription>
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
              <FormDescription>
                A tua password deve ter pelo menos 8 caracteres.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sharePhoneOnMatch"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Partilhar número de telemóvel quando há match
                </FormLabel>
                <FormDescription>
                  Consentes que o teu número de telemóvel seja partilhado com outros estudantes quando há um match para facilitar a comunicação. Esta opção pode ser alterada no teu perfil.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-y-2">
          <Button className="mt-8" type="submit">
            Criar Conta
          </Button>
          <Link className="text-sm underline" href="/login">
            Já tens uma conta? Faz login!
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default Register;
