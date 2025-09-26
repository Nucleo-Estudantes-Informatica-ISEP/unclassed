import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resetPasswordSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = resetPasswordSchema.parse(body);
    const { token, password } = data;

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
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    return NextResponse.json(
      { message: "Password alterada com sucesso." },
      { status: 200 }
    );

  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }

    console.error('Reset password error:', e);
    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}