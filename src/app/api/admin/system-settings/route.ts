import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "key" is required' },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    return NextResponse.json({
      success: true,
      setting: setting ? {
        key: setting.key,
        value: setting.value,
        description: setting.description
      } : null
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: String(value),
        description,
        updatedAt: new Date()
      },
      create: {
        key,
        value: String(value),
        description
      }
    });

    return NextResponse.json({
      success: true,
      setting: {
        key: setting.key,
        value: setting.value,
        description: setting.description
      }
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update system setting' },
      { status: 500 }
    );
  }
}