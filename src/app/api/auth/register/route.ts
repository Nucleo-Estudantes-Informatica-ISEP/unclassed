import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { hashPassword } from "@/lib/auth";
import { exclude } from "@/lib/exclude";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/schemas/authSchema";
import { emailService } from "@/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const { email, name, password, phone, sharePhoneOnMatch } = data;

    const found = await prisma.user.findUnique({ where: { email } });
    if (found) {
      return NextResponse.json(
        {
          error: "Este email já está a ser utilizado.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    
    // Generate email verification token
    const verificationToken = emailService.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry,
        sharePhoneOnMatch,
      },
    });

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    if (!emailSent) {
      // If email fails, we still create the user but warn about it
      console.warn(`Failed to send verification email to ${user.email}`);
    }

    const sanitizedUser = exclude(user, ["password", "verificationToken"]);

    return NextResponse.json({
      ...sanitizedUser,
      message: "Conta criada com sucesso! Verifica o teu email para ativar a conta.",
      emailSent
    }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.errors }, { status: 400 });

    console.error(e);

    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}
