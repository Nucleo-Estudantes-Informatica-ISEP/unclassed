import type { NextRequest } from "next/server";

import { withRequestLogContext } from "@/lib/requestLogContext";
import { handlers } from "@/auth";

export const GET = (request: NextRequest) =>
  withRequestLogContext(request, () => handlers.GET(request));

export const POST = (request: NextRequest) =>
  withRequestLogContext(request, () => handlers.POST(request));
