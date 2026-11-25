import { z } from "zod";

const academicYearSchema = z.number().int().min(1).max(3);
const semesterSchema = z.number().int().min(1).max(2);

// MongoDB ObjectId: a malformed value would make Prisma throw (P2023) and
// surface as a 500 instead of a 400.
const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, { message: "Identificador inválido." });

// Stored upper case so the case-sensitive `code @unique` index also blocks
// case variants (aprog vs APROG).
const subjectCodeSchema = z
  .string()
  .trim()
  .min(1)
  .transform((code) => code.toUpperCase());

const classNameSchema = z.string().trim().min(1).regex(/^[1-3]/, {
  message: "O nome da turma deve começar por 1, 2 ou 3.",
});

export function classNameMatchesYear(name: string, year: number): boolean {
  return name.trim().startsWith(String(year));
}

// Subjects

export const createSubjectSchema = z.object({
  code: subjectCodeSchema,
  name: z.string().trim().min(1),
  year: academicYearSchema,
  semester: semesterSchema,
});

export const updateSubjectSchema = z
  .object({
    id: objectIdSchema,
    code: subjectCodeSchema.optional(),
    name: z.string().trim().min(1).optional(),
    year: academicYearSchema.optional(),
    semester: semesterSchema.optional(),
  })
  .refine(
    ({ code, name, year, semester }) =>
      code !== undefined ||
      name !== undefined ||
      year !== undefined ||
      semester !== undefined,
    { message: "É necessário atualizar pelo menos um campo" },
  );

// Classes

export const createClassSchema = z.object({
  name: classNameSchema,
  year: academicYearSchema,
}).refine(({ name, year }) => classNameMatchesYear(name, year), {
  path: ["name"],
  message: "O nome da turma deve começar pelo ano selecionado.",
});

export const updateClassSchema = z
  .object({
    id: objectIdSchema,
    name: classNameSchema.optional(),
    year: academicYearSchema.optional(),
  })
  .refine(
    ({ name, year }) => name !== undefined || year !== undefined,
    { message: "É necessário atualizar pelo menos um campo" },
  );

// Delete

export const deleteReferenceDataSchema = z.object({
  id: objectIdSchema,
});
