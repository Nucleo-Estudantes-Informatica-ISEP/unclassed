/**
 * Test Match Generation API
 * 
 * Creates sample matches for testing the accept/reject/provisional functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { Class, SingleSwapRequest, Subject, User } from "@prisma/client";
import getServerSession from '@/services/getServerSession';
import prisma from '@/lib/prisma';

/**
 * POST /api/test-matches
 * Create sample matches for testing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only allow admins or in development
    if (session.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Create sample users if they don't exist
    const users = await createSampleUsers();
    
    // Create sample classes if they don't exist
    const classes = await createSampleClasses();
    
    // Create sample subjects if they don't exist
    const subjects = await createSampleSubjects();

    // Create sample swap requests
    const swapRequests = await createSampleSwapRequests(users, classes, subjects);

    // Create sample matches
    const matches = await createSampleMatches(users, classes, swapRequests);

    return NextResponse.json({
      success: true,
      created: {
        users: users.length,
        classes: classes.length,
        subjects: subjects.length,
        swapRequests: swapRequests.length,
        matches: matches.length
      },
      message: 'Matches de exemplo criados com sucesso!'
    });

  } catch (error) {
    console.error('Error creating test matches:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function createSampleUsers() {
  const sampleUsers = [
    { name: 'Alice Silva', email: 'alice@isep.ipp.pt', password: 'password123', phone: '912345678' },
    { name: 'Bruno Santos', email: 'bruno@isep.ipp.pt', password: 'password123', phone: '913456789' },
    { name: 'Carlos Oliveira', email: 'carlos@isep.ipp.pt', password: 'password123', phone: '914567890' },
    { name: 'Diana Costa', email: 'diana@isep.ipp.pt', password: 'password123', phone: '915678901' }
  ];

  const users = [];
  for (const userData of sampleUsers) {
    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!user) {
      user = await prisma.user.create({ data: userData });
    }
    users.push(user);
  }
  
  return users;
}

async function createSampleClasses() {
  const sampleClasses = [
    { name: '1DA', year: 1 },
    { name: '1DB', year: 1 },
    { name: '1DC', year: 1 },
    { name: '2DA', year: 2 },
    { name: '2DB', year: 2 }
  ];

  const classes = [];
  for (const classData of sampleClasses) {
    let classObj = await prisma.class.findUnique({ where: { name: classData.name } });
    if (!classObj) {
      classObj = await prisma.class.create({ data: classData });
    }
    classes.push(classObj);
  }
  
  return classes;
}

async function createSampleSubjects() {
  const sampleSubjects = [
    { code: 'ALGAN', name: 'Álgebra Linear e Geometria Analítica', year: 1, semester: 1 },
    { code: 'APROG', name: 'Algoritmia e Programação', year: 1, semester: 1 },
    { code: 'AMATA', name: 'Análise Matemática', year: 1, semester: 1 },
    { code: 'ESOFT', name: 'Engenharia de Software', year: 2, semester: 1 },
    { code: 'MATCP', name: 'Matemática Computacional', year: 2, semester: 1 }
  ];

  const subjects = [];
  for (const subjectData of sampleSubjects) {
    let subject = await prisma.subject.findUnique({ where: { code: subjectData.code } });
    if (!subject) {
      subject = await prisma.subject.create({ data: subjectData });
    }
    subjects.push(subject);
  }
  
  return subjects;
}

async function createSampleSwapRequests(
  users: User[],
  classes: Class[],
  subjects: Subject[]
): Promise<SingleSwapRequest[]> {
  // Clean existing requests
  await prisma.singleSwapRequest.deleteMany({});
  await prisma.bundleSwapRequest.deleteMany({});

  const swapRequests = [];

  // Create some single swap requests
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const subject = subjects[i % subjects.length];
    const currentClass = classes[i % classes.length];
    const preferredClass = classes[(i + 1) % classes.length];

    const request = await prisma.singleSwapRequest.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        currentClassId: currentClass.id,
        preferredClassIds: [preferredClass.id],
        ticketType: 'SPECIFIC_CLASS',
        status: 'ACTIVE',
        priority: 1,
        graphPartition: `subject-${subject.id}`,
        createdAt: new Date()
      }
    });
    
    swapRequests.push(request);
  }

  return swapRequests;
}

async function createSampleMatches(
  users: User[],
  classes: Class[],
  swapRequests: SingleSwapRequest[]
) {
  // Clean existing matches
  await prisma.match.deleteMany({});

  const matches = [];

  // Create a PROPOSED match (waiting for user acceptance)
  const proposedMatch = await prisma.match.create({
    data: {
      matchType: 'SINGLE',
      swapPattern: 'DIRECT',
      status: 'PROPOSED',
      isProvisional: false,
      satisfactionScore: 0.85,
      processingTime: 150,
      graphPartition: `subject-${swapRequests[0].subjectId}`,
      participants: [
        {
          userId: users[0].id,
          fromClass: classes[0].name,
          toClass: classes[1].name,
          requestId: swapRequests[0].id,
          requestType: 'single',
          satisfactionScore: 0.85,
          status: 'pending'
        },
        {
          userId: users[1].id,
          fromClass: classes[1].name,
          toClass: classes[0].name,
          requestId: swapRequests[1].id,
          requestType: 'single',
          satisfactionScore: 0.85,
          status: 'pending'
        }
      ],
      singleSwapRequestIds: [swapRequests[0].id, swapRequests[1].id],
      bundleSwapRequestIds: []
    }
  });

  // Create a PROVISIONAL match (with 6-hour window)
  const provisionalUntil = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours from now
  const provisionalMatch = await prisma.match.create({
    data: {
      matchType: 'SINGLE',
      swapPattern: 'THREE_WAY',
      status: 'PROVISIONAL',
      isProvisional: true,
      provisionalUntil,
      satisfactionScore: 0.92,
      processingTime: 250,
      graphPartition: `subject-${swapRequests[2].subjectId}`,
      participants: [
        {
          userId: users[0].id,
          fromClass: classes[0].name,
          toClass: classes[1].name,
          requestId: swapRequests[0].id,
          requestType: 'single',
          satisfactionScore: 0.92,
          status: 'accepted'
        },
        {
          userId: users[1].id,
          fromClass: classes[1].name,
          toClass: classes[2].name,
          requestId: swapRequests[1].id,
          requestType: 'single',
          satisfactionScore: 0.90,
          status: 'pending'
        },
        {
          userId: users[2].id,
          fromClass: classes[2].name,
          toClass: classes[0].name,
          requestId: swapRequests[2].id,
          requestType: 'single',
          satisfactionScore: 0.94,
          status: 'pending'
        }
      ],
      singleSwapRequestIds: [swapRequests[0].id, swapRequests[1].id, swapRequests[2].id],
      bundleSwapRequestIds: []
    }
  });

  // Create an ACCEPTED match (ready to complete)
  const acceptedMatch = await prisma.match.create({
    data: {
      matchType: 'SINGLE',
      swapPattern: 'DIRECT',
      status: 'ACCEPTED',
      isProvisional: false,
      satisfactionScore: 0.88,
      processingTime: 180,
      graphPartition: `subject-${swapRequests[3].subjectId}`,
      participants: [
        {
          userId: users[2].id,
          fromClass: classes[2].name,
          toClass: classes[3].name,
          requestId: swapRequests[2].id,
          requestType: 'single',
          satisfactionScore: 0.88,
          status: 'accepted'
        },
        {
          userId: users[3].id,
          fromClass: classes[3].name,
          toClass: classes[2].name,
          requestId: swapRequests[3].id,
          requestType: 'single',
          satisfactionScore: 0.88,
          status: 'accepted'
        }
      ],
      singleSwapRequestIds: [swapRequests[2].id, swapRequests[3].id],
      bundleSwapRequestIds: []
    }
  });

  matches.push(proposedMatch, provisionalMatch, acceptedMatch);
  return matches;
}
