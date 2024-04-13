import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, {
    message: "O teu nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "O email deve ter um formato válido",
  }),
  phone: z.string().regex(/^9[1236]\d{7}$/, {
    message: "O número de telemóvel deve ter um formato válido",
  }),
  password: z.string().min(8, {
    message: "A password deve ter pelo menos 8 caracteres.",
  }),
});

export const loginSchema = z.object({
  email: z.string().email({
    message: "O email deve ter um formato válido",
  }),
  password: z.string().min(8, {
    message: "A password deve ter pelo menos 8 caracteres.",
  }),
});
