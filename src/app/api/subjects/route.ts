import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import * as subjectRepo from "@/application/repositories/subjectRepository";

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { request } = context;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const semester = searchParams.get("semester");
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
  },
});
