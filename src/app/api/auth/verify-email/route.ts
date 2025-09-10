import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token de verificação é obrigatório" },
        { status: 400 }
      );
    }

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email já está verificado" },
        { status: 400 }
      );
    }

    // Verify the email and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });

    return NextResponse.json({
      message: "Email verificado com sucesso",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: true
      }
    });

  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// GET method for verification via URL link
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      // Redirect to verification page with error
      return NextResponse.redirect(new URL('/auth/verify-email?error=missing_token', req.url));
    }

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      // Redirect to verification page with error
      return NextResponse.redirect(new URL('/auth/verify-email?error=invalid_token', req.url));
    }

    if (user.emailVerified) {
      // Redirect to login with success message
      return NextResponse.redirect(new URL('/login?message=already_verified', req.url));
    }

    // Verify the email and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?message=email_verified', req.url));

  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.redirect(new URL('/auth/verify-email?error=server_error', req.url));
  }
}
