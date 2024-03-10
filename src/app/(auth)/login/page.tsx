"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/lib/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/lib/components/ui/form";
import { Input } from "@/lib/components/ui/input";

const Register: React.FC = () => {
  const formSchema = z.object({
    email: z.string().email({
      message: "O email deve ter um formato válido",
    }),
    password: z.string().min(8, {
      message: "A password deve ter pelo menos 8 caracteres.",
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
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
                <Input placeholder="Password..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-y-2">
          <Button className="mt-8" type="submit">
            Entrar
          </Button>
          <Link className="text-sm underline" href="/register">
            Ainda não tens conta? Regista-te!
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default Register;
