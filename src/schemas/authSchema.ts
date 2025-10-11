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
  confirmPassword: z.string().min(8, {
    message: "A confirmação da password deve ter pelo menos 8 caracteres.",
  }),
  sharePhoneOnMatch: z.boolean().default(false),
  shareNameAndEmail: z.boolean().refine(val => val === true, {
    message: "Deves aceitar partilhar o nome e email para continuar.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email({
    message: "O email deve ter um formato válido",
  }),
  password: z.string().min(8, {
    message: "A password deve ter pelo menos 8 caracteres.",
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "O email deve ter um formato válido",
  }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, {
    message: "Token é obrigatório",
  }),
  password: z.string().min(8, {
    message: "A password deve ter pelo menos 8 caracteres.",
  }),
  confirmPassword: z.string().min(8, {
    message: "A confirmação da password deve ter pelo menos 8 caracteres.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem.",
  path: ["confirmPassword"],
});
