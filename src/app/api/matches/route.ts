import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const matchType = searchParams.get("matchType");
    const userId = searchParams.get("userId");

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (matchType) {
      where.matchType = matchType;
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    // Filter matches that involve the user (if not admin)
    let filteredMatches = matches;
    if (session.role !== "ADMIN") {
      filteredMatches = matches.filter(match => 
        (match.participants as any[]).some((p: any) => p.userId === session.id)
      );
    } else if (userId) {
      filteredMatches = matches.filter(match => 
        (match.participants as any[]).some((p: any) => p.userId === userId)
      );
    }

    // Enrich matches with user and class information
    const enrichedMatches = await Promise.all(
      filteredMatches.map(async (match) => {
        const participants = match.participants as any[];
        
        // Get user information for participants
        const userIds = participants.map(p => p.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true }
        });
        
        // Get class information
        const classIds = [
          ...participants.map(p => p.fromClass),
          ...participants.map(p => p.toClass)
        ];
        const classes = await prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, name: true, year: true }
        });
        
        const enrichedParticipants = participants.map(p => {
          const user = users.find(u => u.id === p.userId);
          const fromClass = classes.find(c => c.id === p.fromClass);
          const toClass = classes.find(c => c.id === p.toClass);
          
          return {
            ...p,
            user,
            fromClass,
            toClass
          };
        });
        
        return {
          ...match,
          participants: enrichedParticipants
        };
      })
    );

    return NextResponse.json(enrichedMatches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
