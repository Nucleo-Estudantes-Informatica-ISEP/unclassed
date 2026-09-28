import { NextRequest } from "next/server";

import { withRequestLogContext } from "@/lib/requestLogContext";

import { handleCreateSwapRequest, handleGetSwapRequests } from "../handlers";

export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    return handleGetSwapRequests(request, "single");
  });
}

export async function POST(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    return handleCreateSwapRequest(request, "single");
  });
}
