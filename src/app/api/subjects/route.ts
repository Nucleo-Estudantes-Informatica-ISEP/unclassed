import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { logger, safeError } from "@/lib/logger";
import { withRequestLogContext } from "@/lib/requestLogContext";
import * as subjectRepo from "@/application/repositories/subjectRepository";

export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    try {
      const authResult = await authorizeRequest(request);
      if (!authResult.ok) {
        return authResult.response;
      }

      const { searchParams } = new URL(request.url);
      const year = searchParams.get("year");
      const semester = searchParams.get("semester");

      // Build where clause
      const where: { year?: number; semester?: number } = {};

      if (year) {
        where.year = parseInt(year);
      }

      if (semester) {
        where.semester = parseInt(semester);
      }

      const subjects = await subjectRepo.findSubjects({
        year: where.year as number | undefined,
        semester: where.semester as number | undefined,
      });

      return NextResponse.json(subjects);
    } catch (error) {
      logger.error(safeError(error), "Error fetching subjects:");
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  });
}
