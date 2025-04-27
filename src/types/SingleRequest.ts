import { z } from "zod"

export const singleRequestSchema = z.object({
    id: z.string(),
    userId: z.string(),
    subjectId: z.string(),
    currentClassId: z.string(),
    preferredClasses: z.array(z.string()), // Replace with z.array(Class) if Class is defined
    status: z.enum(["pending", "completed", "failed"]),
    createdAt: z.date(),
    lastProcessed: z.date()
})