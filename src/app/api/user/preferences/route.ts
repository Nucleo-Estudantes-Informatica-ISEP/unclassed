import { NextRequest, NextResponse } from "next/server";

import * as userService from "@/application/services/userService";
import { ValidationError } from "@/application/services/userService";
import { authorizeRequest } from "@/lib/apiAccess";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authorizeRequest(req);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const user = await userService.getPreferences(session.id);

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      emailVerified: user.emailVerified,
      sharePhoneOnMatch: user.sharePhoneOnMatch,
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
    const authResult = await authorizeRequest(req, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const { emailNotifications, sharePhoneOnMatch, phone } = await req.json();

    try {
      const result = await userService.updatePreferences(session.id, {
        emailNotifications,
        sharePhoneOnMatch,
        phone,
      });

      return NextResponse.json({
        message: "Preferências atualizadas com sucesso",
        user: result,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
