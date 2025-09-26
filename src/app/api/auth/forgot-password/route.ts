import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import prisma from "@/lib/prisma";
import { forgotPasswordSchema } from "@/schemas/authSchema";
import { emailService } from "@/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = forgotPasswordSchema.parse(body);
    const { email } = data;

    // Find user by email
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true
      }
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists and is verified
    if (user && user.emailVerified) {
      // Generate password reset token
      const resetToken = emailService.generatePasswordResetToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        },
      });

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
        // Don't reveal email sending failure to prevent enumeration
      }
    }

    // Always return success response
    return NextResponse.json(
      { 
        message: "Se o email existir na nossa base de dados, receberás um link de recuperação." 
      },
      { status: 200 }
    );

  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }

    console.error('Forgot password error:', e);
    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}