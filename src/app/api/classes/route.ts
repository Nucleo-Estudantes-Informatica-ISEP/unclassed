import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import * as classRepo from "@/application/repositories/classRepository";

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { request } = context;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const where: { year?: number } = {};
    if (year) {
      where.year = parseInt(year);
    }
    const classes = await classRepo.findClasses({
      year: where.year as number | undefined,
    });
    return NextResponse.json(classes);
  },
});
