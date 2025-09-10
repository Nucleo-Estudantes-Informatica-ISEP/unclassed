import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { comparePassword, setCookie, signJwt } from "@/lib/auth";
import { exclude } from "@/lib/exclude";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);
    const { email, password } = data;

    const found = await prisma.user.findUnique({ where: { email } });
    if (!found) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const match = await comparePassword(password, found.password);

    if (!match) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!found.emailVerified) {
      return NextResponse.json(
        { 
          error: "Por favor verifica o teu email antes de fazer login.",
          emailVerificationRequired: true,
          email: found.email
        },
        { status: 401 }
      );
    }

    const { id, role } = found;
    const token = signJwt({ id, role });
    setCookie(token);

    const sanitizedUser = exclude(found, ["password", "verificationToken"]);

    return NextResponse.json(sanitizedUser, { status: 200 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.errors }, { status: 400 });

    return NextResponse.json(
      { error: "Ocorreu um erro inesperado." },
      { status: 500 }
    );
  }
}
