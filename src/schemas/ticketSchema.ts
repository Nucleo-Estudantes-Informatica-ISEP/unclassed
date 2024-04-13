import { z } from "zod";

export const ticketSchema = z.object({
  uploadId: z.string().uuid(),
});
