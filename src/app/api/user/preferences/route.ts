import { NextResponse } from "next/server";
import { z } from "zod";

import { defineHandler } from "@/lib/defineHandler";
import * as userService from "@/application/services/userService";
import { ValidationError } from "@/application/services/userService";

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { session } = context;
    const user = await userService.getPreferences(session.id);
    if (!user) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      emailVerified: user.emailVerified,
      sharePhoneOnMatch: user.sharePhoneOnMatch,
    });
  },
});

export const PATCH = defineHandler({
  schema: z.object({
    emailNotifications: z.unknown().optional(),
    sharePhoneOnMatch: z.unknown().optional(),
    phone: z.unknown().optional(),
  }),
  onError: (error) => {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  },
  handler: async ({ session, body }) => {
    const result = await userService.updatePreferences(session.id, body);
    return NextResponse.json({
      message: "Preferências atualizadas com sucesso",
      user: result,
    });
  },
});
