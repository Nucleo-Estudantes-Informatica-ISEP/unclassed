import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emailService } from "@/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email já está verificado" },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = emailService.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry
      }
    });

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "Falha ao enviar email de verificação" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Email de verificação enviado com sucesso",
      email: user.email
    });

  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
