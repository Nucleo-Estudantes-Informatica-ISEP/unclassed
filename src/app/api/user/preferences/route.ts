import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        phone: true,
        emailNotifications: true,
        emailVerified: true,
        sharePhoneOnMatch: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      emailVerified: user.emailVerified,
      sharePhoneOnMatch: user.sharePhoneOnMatch
    });

  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { emailNotifications, sharePhoneOnMatch, phone } = await req.json();

    // Validate inputs
    const updateData: Prisma.UserUpdateInput = {};
    
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

    if (phone !== undefined) {
      if (phone !== null && typeof phone !== "string") {
        return NextResponse.json(
          { error: "phone deve ser texto ou null" },
          { status: 400 }
        );
      }

      const trimmedPhone = phone?.trim() || null;
      const isValidPhone =
        trimmedPhone === null || /^9[1236]\d{7}$/.test(trimmedPhone);

      if (!isValidPhone) {
        return NextResponse.json(
          { error: "Número de telemóvel inválido" },
          { status: 400 }
        );
      }

      updateData.phone = trimmedPhone;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        phone: true,
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
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
