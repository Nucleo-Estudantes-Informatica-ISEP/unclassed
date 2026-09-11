import { NextRequest } from "next/server";
import { handleCreateSwapRequest, handleGetSwapRequests } from "../handlers";

export async function GET(request: NextRequest) {
  return handleGetSwapRequests(request, "bundle");
}

export async function POST(request: NextRequest) {
  return handleCreateSwapRequest(request, "bundle");
}
