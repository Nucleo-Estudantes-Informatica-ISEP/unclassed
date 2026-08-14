import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { authorizeRequest } from "@/lib/apiAccess";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    // Build where clause
    const where: Prisma.ClassWhereInput = {};
    
    if (year) {
      where.year = parseInt(year);
    }

    const classes = await prisma.class.findMany({
      where,
      orderBy: [
        { year: "asc" },
        { name: "asc" }
      ]
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
