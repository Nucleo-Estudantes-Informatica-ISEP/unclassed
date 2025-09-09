import { z } from "zod";

export const singleSwapRequestSchema = z.object({
  subjectId: z.string().min(1, "Por favor seleciona uma disciplina"),
  currentClassId: z.string().min(1, "Por favor seleciona a tua turma atual"),
  preferredClassIds: z.array(z.string()).min(1, "Por favor seleciona pelo menos uma turma preferida"),
  preferenceOrderMatters: z.boolean().default(true),
});

export const bundleSwapRequestSchema = z.object({
  currentClassId: z.string().min(1, "Por favor seleciona a tua turma atual"),
  preferredClassIds: z.array(z.string()).min(1, "Por favor seleciona pelo menos uma turma preferida"),
  preferenceOrderMatters: z.boolean().default(true),
});

export type SingleSwapRequestForm = z.infer<typeof singleSwapRequestSchema>;
export type BundleSwapRequestForm = z.infer<typeof bundleSwapRequestSchema>;
