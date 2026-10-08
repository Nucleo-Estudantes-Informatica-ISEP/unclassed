import { z } from "zod";

const academicYearSchema = z.number().int().min(1).max(3);
const semesterSchema = z.number().int().min(1).max(2);

const classNameSchema = z.string().trim().min(1).regex(/^[1-3]/, {
  message: "Class name must start with 1, 2, or 3.",
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
    { message: "At least one field must be updated" },
  );

// Classes

export const createClassSchema = z.object({
  name: classNameSchema,
  year: academicYearSchema,
}).refine(({ name, year }) => classNameMatchesYear(name, year), {
  path: ["name"],
  message: "Class name must start with the selected year.",
});

export const updateClassSchema = z
  .object({
    id: z.string().trim().min(1),
    name: classNameSchema.optional(),
    year: academicYearSchema.optional(),
  })
  .refine(
    ({ name, year }) => name !== undefined || year !== undefined,
    { message: "At least one field must be updated" },
  );

// Delete

export const deleteReferenceDataSchema = z.object({
  id: z.string().trim().min(1),
});
