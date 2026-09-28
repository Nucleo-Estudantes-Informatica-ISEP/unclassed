import { NextRequest } from "next/server";

import { withRequestLogContext } from "@/lib/requestLogContext";

import {
  handleDeleteSwapRequest,
  handleGetSwapRequestById,
  handleUpdateSwapRequest,
  RouteContext,
} from "../../handlers";

export async function GET(request: NextRequest, context: RouteContext) {
  return withRequestLogContext(request, async () => {
    return handleGetSwapRequestById(request, context, "bundle");
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withRequestLogContext(request, async () => {
    return handleUpdateSwapRequest(request, context, "bundle");
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRequestLogContext(request, async () => {
    return handleDeleteSwapRequest(request, context, "bundle");
  });
}
