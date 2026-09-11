import { NextRequest } from "next/server";
import { handleCreateSwapRequest, handleGetSwapRequests } from "../handlers";

export async function GET(request: NextRequest) {
  return handleGetSwapRequests(request, "single");
}

export async function POST(request: NextRequest) {
  return handleCreateSwapRequest(request, "single");
}
