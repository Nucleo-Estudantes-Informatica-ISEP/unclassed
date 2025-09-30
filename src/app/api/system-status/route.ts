import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { INVALIDATE_CDN_CACHE_CONTROL_VALUE } from "@/lib/constants";

// Ensure this route is always evaluated dynamically and not cached by Next.js
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // This endpoint is public - anyone can check system status
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'system_unavailable' }
    });

    const isUnavailable = setting?.value === 'true';

    return new NextResponse(
      JSON.stringify({
        success: true,
        unavailable: isUnavailable
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': INVALIDATE_CDN_CACHE_CONTROL_VALUE,
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error checking system status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check system status' },
      { status: 500 }
    );
  }
}