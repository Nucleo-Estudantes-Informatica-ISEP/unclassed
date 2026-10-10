import { z } from "zod";

const academicYearSchema = z.number().int().min(1).max(3);
const semesterSchema = z.number().int().min(1).max(2);

const classNameSchema = z.string().trim().min(1).regex(/^[1-3]/, {
  message: "O nome da turma deve começar por 1, 2 ou 3.",
});

export function classNameMatchesYear(name: string, year: number): boolean {
  return name.trim().startsWith(String(year));
}

// Subjects

export const createSubjectSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  year: academicYearSchema,
  semester: semesterSchema,
});

export const updateSubjectSchema = z
  .object({
    id: z.string().trim().min(1),
    code: z.string().trim().min(1).optional(),
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
    id: z.string().trim().min(1),
    name: classNameSchema.optional(),
    year: academicYearSchema.optional(),
  })
  .refine(
    ({ name, year }) => name !== undefined || year !== undefined,
    { message: "É necessário atualizar pelo menos um campo" },
  );

// Delete

export const deleteReferenceDataSchema = z.object({
  id: z.string().trim().min(1),
});
