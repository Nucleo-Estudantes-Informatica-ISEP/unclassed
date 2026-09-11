import { NextRequest } from "next/server";
import {
  handleDeleteSwapRequest,
  handleGetSwapRequestById,
  handleUpdateSwapRequest,
  RouteContext,
} from "../../handlers";

export async function GET(request: NextRequest, context: RouteContext) {
  return handleGetSwapRequestById(request, context, "bundle");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleUpdateSwapRequest(request, context, "bundle");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleDeleteSwapRequest(request, context, "bundle");
}
