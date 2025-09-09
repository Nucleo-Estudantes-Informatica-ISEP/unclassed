import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { hashPassword, setCookie, signJwt } from "@/lib/auth";
import { exclude } from "@/lib/exclude";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/schemas/authSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const { email, name, password, phone } = data;

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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
      },
    });

    const { id, role } = user;
    const token = signJwt({ id, role });
    setCookie(token);

    const sanitizedUser = exclude(user, ["password"]);

    return NextResponse.json(sanitizedUser, { status: 201 });
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
