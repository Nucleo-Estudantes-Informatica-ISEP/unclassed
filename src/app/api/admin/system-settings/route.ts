import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // Get specific setting
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
    } else {
      // Get all settings
      const settings = await prisma.systemSettings.findMany({
        select: {
          key: true,
          value: true,
          description: true,
          updatedAt: true
        }
      });

      return NextResponse.json({
        success: true,
        settings
      });
    }
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
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

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