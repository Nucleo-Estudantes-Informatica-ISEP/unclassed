import { z } from "zod";

export const MAX_PREFERRED_CLASSES = 20;

const databaseIdSchema = z
  .string()
  .min(1, "Identificador obrigatório")
  .max(64, "Identificador inválido");

const preferredClassIdsSchema = z
  .array(databaseIdSchema)
  .min(1, "Por favor seleciona pelo menos uma turma preferida")
  .max(
    MAX_PREFERRED_CLASSES,
    `Só podes selecionar até ${MAX_PREFERRED_CLASSES} turmas preferidas`
  );

export const singleSwapRequestSchema = z.object({
  subjectId: databaseIdSchema,
  currentClassId: databaseIdSchema,
  preferredClassIds: preferredClassIdsSchema,
  preferenceOrderMatters: z.boolean(),
});

export const bundleSwapRequestSchema = z.object({
  currentClassId: databaseIdSchema,
  preferredClassIds: preferredClassIdsSchema,
  preferenceOrderMatters: z.boolean(),
});

export type SingleSwapRequestForm = z.infer<typeof singleSwapRequestSchema>;
export type BundleSwapRequestForm = z.infer<typeof bundleSwapRequestSchema>;
