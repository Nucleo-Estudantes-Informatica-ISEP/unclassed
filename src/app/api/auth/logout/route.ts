import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/config";

export async function POST() {
  try {
    // Clear the authentication cookie
    cookies().delete(config.cookies.auth.name);
    
    return NextResponse.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
