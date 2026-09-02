import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { authorizeRequest } from "@/lib/apiAccess";
import * as subjectRepo from "@/application/repositories/subjectRepository";

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

    const subjects = await subjectRepo.findSubjects({
      year: where.year as number | undefined,
      semester: where.semester as number | undefined
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
