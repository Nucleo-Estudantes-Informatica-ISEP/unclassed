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
    const semester = searchParams.get("semester");

    // Build where clause
    const where: Prisma.SubjectWhereInput = {};
    
    if (year) {
      where.year = parseInt(year);
    }
    
    if (semester) {
      where.semester = parseInt(semester);
    }

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: [
        { year: "asc" },
        { semester: "asc" },
        { code: "asc" }
      ]
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
