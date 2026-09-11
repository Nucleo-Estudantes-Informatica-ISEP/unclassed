import { NextRequest, NextResponse } from "next/server";
import type { Class, SingleSwapRequest, Subject, User } from "@prisma/client";

import { authorizeRequest } from "@/lib/apiAccess";
import prisma from "@/lib/prisma";
import * as classRepo from "@/application/repositories/classRepository";
import * as subjectRepo from "@/application/repositories/subjectRepository";

import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const authResult = await authorizeRequest(request, {
    devOnly: true,
    requireAdmin: true,
    enforceSameOriginForSessionWrites: true,
  });
  if (!authResult.ok) return authResult.response;

  try {
    const users = await createSampleUsers();
    const classes = await getSeededClasses();
    const subject = await getSeededSubject();

    await prisma.match.deleteMany();
    await prisma.singleSwapRequest.deleteMany();
    await prisma.bundleSwapRequest.deleteMany();

    const swapRequests = await createSampleSwapRequests(
      users,
      classes,
      subject
    );
    const matches = await createSampleMatches(users, classes, swapRequests);

    return NextResponse.json({
      success: true,
      created: {
        users: users.length,
        classes: classes.length,
        subjects: 1,
        swapRequests: swapRequests.length,
        matches: matches.length,
      },
      message: "Matches de exemplo criados com sucesso!",
    });
  } catch (error) {
    console.error("Error creating test matches:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

async function createSampleUsers(): Promise<User[]> {
  const password = await bcrypt.hash("password123", 10);
  return Promise.all(
    ["Alice Silva", "Bruno Santos", "Carlos Oliveira", "Diana Costa"].map(
      (name, index) =>
        prisma.user.upsert({
          where: { email: `test-match-${index + 1}@isep.ipp.pt` },
          update: {},
          create: {
            name,
            email: `test-match-${index + 1}@isep.ipp.pt`,
            password,
            phone: `91${index + 2}345678`,
          },
        })
    )
  );
}

async function getSeededClasses(): Promise<Class[]> {
  const names = ["1DA", "1DB", "1DC", "1DD"];
  const classes = await classRepo.findByNames(names);
  const byName = new Map(classes.map((entry) => [entry.name, entry]));

  return names.map((name) => {
    const entry = byName.get(name);
    if (!entry) throw new Error(`Missing seeded class ${name}; run pnpm seed`);
    return entry;
  });
}

async function getSeededSubject(): Promise<Subject> {
  const subject = await subjectRepo.findByCode("ALGAN");
  if (!subject) throw new Error("Missing seeded subject ALGAN; run pnpm seed");
  return subject;
}

async function createSampleSwapRequests(
  users: User[],
  classes: Class[],
  subject: Subject
): Promise<SingleSwapRequest[]> {
  return Promise.all(
    users.map((user, index) => {
      const currentClass = classes[index];
      const preferredClass = classes[(index + 1) % classes.length];
      return prisma.singleSwapRequest.create({
        data: {
          userId: user.id,
          subjectId: subject.id,
          currentClassId: currentClass.id,
          preferredClassIds: [preferredClass.id],
          ticketType: "SPECIFIC_CLASS",
          status: "ACTIVE",
          priority: 1,
          graphPartition: `subject-${subject.id}`,
        },
      });
    })
  );
}

async function createSampleMatches(
  users: User[],
  classes: Class[],
  requests: SingleSwapRequest[]
) {
  const participants = users.map((user, index) => ({
    userId: user.id,
    fromClass: classes[index].name,
    toClass: classes[(index + 1) % classes.length].name,
    requestId: requests[index].id,
    requestType: "single",
    satisfactionScore: 0.9,
    status: index === 0 ? "accepted" : "pending",
  }));
  const graphPartition = `subject-${requests[0].subjectId}`;

  return Promise.all([
    prisma.match.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        satisfactionScore: 0.85,
        processingTime: 150,
        graphPartition,
        participants: participants.slice(0, 2),
        singleSwapRequestIds: requests.slice(0, 2).map(({ id }) => id),
        bundleSwapRequestIds: [],
      },
    }),
    prisma.match.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "THREE_WAY",
        status: "PROVISIONAL",
        isProvisional: true,
        provisionalUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
        satisfactionScore: 0.92,
        processingTime: 250,
        graphPartition,
        participants: participants.slice(0, 3),
        singleSwapRequestIds: requests.slice(0, 3).map(({ id }) => id),
        bundleSwapRequestIds: [],
      },
    }),
    prisma.match.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "ACCEPTED",
        satisfactionScore: 0.88,
        processingTime: 180,
        graphPartition,
        participants: participants.slice(2, 4),
        singleSwapRequestIds: requests.slice(2, 4).map(({ id }) => id),
        bundleSwapRequestIds: [],
      },
    }),
  ]);
}
