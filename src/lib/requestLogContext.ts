import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { withLogContext } from "@/lib/logger";

export function withRequestLogContext<T>(
  request: NextRequest,
  run: () => T
): T {
  const incomingId = request.headers.get("x-request-id");
  const requestId =
    incomingId && /^[a-f0-9-]{36}$/i.test(incomingId)
      ? incomingId
      : randomUUID();
  return withLogContext({ requestId }, run);
}
