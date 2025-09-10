import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        emailNotifications: true,
        emailVerified: true,
        sharePhoneOnMatch: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications,
      emailVerified: user.emailVerified,
      sharePhoneOnMatch: user.sharePhoneOnMatch
    });

  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailNotifications, sharePhoneOnMatch } = await req.json();

    // Validate inputs
    const updateData: any = {};
    
    if (emailNotifications !== undefined) {
      if (typeof emailNotifications !== "boolean") {
        return NextResponse.json(
          { error: "emailNotifications deve ser um valor booleano" },
          { status: 400 }
        );
      }
      updateData.emailNotifications = emailNotifications;
    }
    
    if (sharePhoneOnMatch !== undefined) {
      if (typeof sharePhoneOnMatch !== "boolean") {
        return NextResponse.json(
          { error: "sharePhoneOnMatch deve ser um valor booleano" },
          { status: 400 }
        );
      }
      updateData.sharePhoneOnMatch = sharePhoneOnMatch;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        emailNotifications: true,
        emailVerified: true,
        sharePhoneOnMatch: true,
        name: true,
        email: true
      }
    });

    return NextResponse.json({
      message: "Preferências atualizadas com sucesso",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
