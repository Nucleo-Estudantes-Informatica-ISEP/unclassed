import { NextResponse } from "next/server";
import { ZodError } from "zod";

import prisma from "@/lib/prisma";
import { ticketSchema } from "@/schemas/ticketSchema";

export async function POST(req: Request) {
  try {
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.errors }, { status: 400 });

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
