import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { logger, safeError } from "@/lib/logger";
import { withRequestLogContext } from "@/lib/requestLogContext";
import * as classRepo from "@/application/repositories/classRepository";

export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    try {
      const authResult = await authorizeRequest(request);
      if (!authResult.ok) {
        return authResult.response;
      }

      const { searchParams } = new URL(request.url);
      const year = searchParams.get("year");

      // Build where clause
      const where: { year?: number } = {};

      if (year) {
        where.year = parseInt(year);
      }

      const classes = await classRepo.findClasses({
        year: where.year as number | undefined,
      });

      return NextResponse.json(classes);
    } catch (error) {
      logger.error(safeError(error), "Error fetching classes:");
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  });
}
