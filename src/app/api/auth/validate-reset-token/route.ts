import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";

const validateTokenSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = validateTokenSchema.parse(body);

    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Token válido." },
      { status: 200 }
    );

  } catch (e) {
    console.error('Validate reset token error:', e);
    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}