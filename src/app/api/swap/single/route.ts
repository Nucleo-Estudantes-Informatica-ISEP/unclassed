import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";

export async function GET(request: Request) {
    const session = await getServerSession();
    const type = new URL(request.url).searchParams.get("type");
    
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!type) {
        return new Response("Missing type", { status: 400 });
    }

    let where: { userId?: string; classId?: string; courseId?: string; subjectId?: string; matchId?: string } = {};

    switch (type) {
        case "user":
            where = {
                userId: session.id,
            };
            break;
        case "class":
            const classId = new URL(request.url).searchParams.get("classId");
            if (!classId) {
                return new Response("Missing classId", { status: 400 });
            }
            where = {
                classId: classId,
            };
            break;
        case "course":
            const courseId = new URL(request.url).searchParams.get("courseId");
            if (!courseId) {
                return new Response("Missing courseId", { status: 400 });
            }
            where = {
                courseId: courseId,
            };
            break;
        case "subject":
            const subjectId = new URL(request.url).searchParams.get("subjectId");
            if (!subjectId) {
                return new Response("Missing subjectId", { status: 400 });
            }
            where = {
                subjectId: subjectId,
            };
            break;
        case "match":
            const matchId = new URL(request.url).searchParams.get("matchId");
            if (!matchId) {
                return new Response("Missing matchId", { status: 400 });
            }
            where = {
                matchId: matchId,
            };
            break;
        default:
            return new Response("Invalid type", { status: 400 });
    }
    const requests = await prisma.singleSwapRequest.findMany({
        where
    });

    return new Response(JSON.stringify(requests), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function POST(request: Request) {
    const session = await getServerSession();

    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { subjectId, currentClassId, preferredClasses } = body;

    if (!subjectId || !currentClassId || !preferredClasses) {
        return new Response("Missing required fields", { status: 400 });
    }

    // check if the user already has a request for this subjectId
    const existingRequest = await prisma.singleSwapRequest.findFirst({
        where: {
            userId: session.id,
            subjectId,
            currentClassId,
        },
    });
    
    if (existingRequest) {
        return new Response("Request already exists", { status: 400 });
    }

    const newRequest = await prisma.singleSwapRequest.create({
        data: {
            userId: session.id,
            subjectId,
            currentClassId,
            preferredClasses,
            status: "pending",
        },
    });

    return new Response(JSON.stringify(newRequest), {
        status: 201,
        headers: {
            "Content-Type": "application/json",
        },
    });
}