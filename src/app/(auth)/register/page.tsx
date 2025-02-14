"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import swal from "sweetalert";
import { z } from "zod";

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
import { registerSchema } from "@/schemas/authSchema";

const Register: React.FC = () => {
  const formSchema = registerSchema;
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await fetch("/api/auth/register", {
      method: "post",
      body: JSON.stringify(values),
    });

    if (res.status === 201) {
      swal("Conta criada com sucesso!", "Agora podes fazer login.", "success");
      router.push("/login");
    } else {
      swal("Erro ao criar conta", "Por favor tenta novamente.", "error");
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
