import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Subject data from ISEP courses
const subjectsData = [
  // 1st Year - 1st Semester
  { code: "ALGAN", name: "Álgebra Linear e Geometria Analítica", year: 1, semester: 1 },
  { code: "APROG", name: "Algoritmia e Programação", year: 1, semester: 1 },
  { code: "AMATA", name: "Análise Matemática", year: 1, semester: 1 },
  { code: "PRCMP", name: "Princípios da Computacao", year: 1, semester: 1 },
  { code: "LAPR1", name: "Laboratório/Projeto 1", year: 1, semester: 1 },

  // 2nd Year - 1st Semester
  { code: "ESOFT", name: "Engenharia de Software", year: 1, semester: 2 },
  { code: "MATCP", name: "Matemática Computacional", year: 1, semester: 2 },
  { code: "MDISC", name: "Matemática Discreta", year: 1, semester: 2 },
  { code: "PPROG", name: "Paradigmas de Programação", year: 1, semester: 2 },
  { code: "LAPR2", name: "Laboratório/Projeto 2", year: 1, semester: 2 },

  // 3rd Year - 1st Semester
  { code: "ARQCP", name: "Arquitetura de Computadores", year: 2, semester: 1 },
  { code: "BDDAD", name: "Base de Dados", year: 2, semester: 1 },
  { code: "ESINF", name: "Estruturas de Informação", year: 2, semester: 1 },
  { code: "FSIAP", name: "Física Aplicada", year: 2, semester: 1 },
  { code: "LAPR3", name: "Laboratório/Projeto 3", year: 2, semester: 1 },

  // 4th Year - 1st Semester
  { code: "EAPLI", name: "Engenharia de Aplicações", year: 2, semester: 2 },
  { code: "LPROG", name: "Linguagens de Programação", year: 2, semester: 2 },
  { code: "RCOMP", name: "Redes de Computadores", year: 2, semester: 2 },
  { code: "SCOMP", name: "Sistemas de Computadores", year: 2, semester: 2 },
  { code: "LAPR4", name: "Laboratório/Projeto 4", year: 2, semester: 2 },

  // 5th Year - 1st Semester
  { code: "ASIST", name: "Administração de Sistemas", year: 3, semester: 1 },
  { code: "ALGAV", name: "Algoritmia Avançada", year: 3, semester: 1 },
  { code: "ARQSI", name: "Arquitetura de Sistemas", year: 3, semester: 1 },
  { code: "GESTA", name: "Gestão", year: 3, semester: 1 },
  { code: "SGRAI", name: "Sistemas Gráficos e Interacao", year: 3, semester: 1 },
  { code: "LAPR5", name: "Laboratório de Projeto 5", year: 3, semester: 1 },

  // 6th Year - 1st Semester
  { code: "ANADI", name: "Análise de Dados em Informática", year: 3, semester: 2 },
  { code: "CORGA", name: "Computação Organizacional", year: 3, semester: 2 },
  { code: "INFOR", name: "Informática nas Organizações", year: 3, semester: 2 },
  { code: "PESTI", name: "Projeto/Estágio", year: 3, semester: 2 }
];

// Class data for each year
const classesData = [
  // 1st Year Classes
  { name: "1DA", year: 1 },
  { name: "1DB", year: 1 },
  { name: "1DC", year: 1 },
  { name: "1DD", year: 1 },
  { name: "1DE", year: 1 },
  { name: "1DF", year: 1 },
  { name: "1DG", year: 1 },
  { name: "1DH", year: 1 },
  { name: "1DI", year: 1 },
  { name: "1DJ", year: 1 },
  { name: "1DK", year: 1 },
  { name: "1DL", year: 1 },
  { name: "1DM", year: 1 },
  { name: "1DN", year: 1 },
  { name: "1DP", year: 1 },
  { name: "1NA", year: 1 },
  { name: "1NB", year: 1 },
  { name: "1NC", year: 1 },
  { name: "1ND", year: 1 },

  // 2nd Year Classes
  { name: "2DA", year: 2 },
  { name: "2DB", year: 2 },
  { name: "2DC", year: 2 },
  { name: "2DD", year: 2 },
  { name: "2DE", year: 2 },
  { name: "2DF", year: 2 },
  { name: "2DG", year: 2 },
  { name: "2DH", year: 2 },
  { name: "2DI", year: 2 },
  { name: "2DJ", year: 2 },
  { name: "2DK", year: 2 },
  { name: "2DL", year: 2 },
  { name: "2DM", year: 2 },
  { name: "2DN", year: 2 },
  { name: "2DP", year: 2 },
  { name: "2NA", year: 2 },
  { name: "2NB", year: 2 },
  { name: "2NC", year: 2 },

  // 3rd Year Classes
  { name: "3DA", year: 3 },
  { name: "3DB", year: 3 },
  { name: "3DC", year: 3 },
  { name: "3DD", year: 3 },
  { name: "3DE", year: 3 },
  { name: "3DF", year: 3 },
  { name: "3DG", year: 3 },
  { name: "3DH", year: 3 },
  { name: "3DI", year: 3 },
  { name: "3DJ", year: 3 },
  { name: "3DK", year: 3 },
  { name: "3DL", year: 3 },
  { name: "3NA", year: 3 },
  { name: "3NB", year: 3 },
];

async function main() {
  console.log("Seeding database...");

  // Create subjects
  console.log("Creating subjects...");
  const subjects = [];
  for (const subjectData of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { code: subjectData.code },
      update: {},
      create: subjectData,
    });
    subjects.push(subject);
  }

  // Create classes
  console.log("Creating classes...");
  const classes = [];
  for (const classData of classesData) {
    const classEntity = await prisma.class.upsert({
      where: { name: classData.name },
      update: {},
      create: classData,
    });
    classes.push(classEntity);
  }

/*  // Create sample users
  console.log("Creating sample users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@isep.ipp.pt" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@isep.ipp.pt",
      password: hashedPassword,
      phone: "912345678",
      role: "ADMIN",
    },
  });

  const users = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.upsert({
      where: { email: `student${i}@isep.ipp.pt` },
      update: {},
      create: {
        name: `Student ${i}`,
        email: `student${i}@isep.ipp.pt`,
        password: hashedPassword,
        phone: `91234567${i % 10}`,
        role: "USER",
      },
    });
    users.push(user);
  }

  // Create sample single swap requests
  console.log("Creating sample single swap requests...");
  const firstYearClasses = classes.filter(c => c.year === 1);
  const firstYearSubjects = subjects.filter(s => s.year === 1);

  for (let i = 0; i < 5; i++) {
    const user = users[i];
    const subject = firstYearSubjects[i % firstYearSubjects.length];
    const currentClass = firstYearClasses[0]; // 1DA
    const preferredClass = firstYearClasses[1]; // 1DB

    await prisma.singleSwapRequest.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        currentClassId: currentClass.id,
        preferredClassIds: [preferredClass.id],
        status: "ACTIVE",
        ticketType: "SPECIFIC_CLASS",
        priority: 1,
        graphPartition: `subject-${subject.id}`,
      },
    });
  }

  // Create sample bundle swap requests
  console.log("Creating sample bundle swap requests...");
  for (let i = 5; i < 8; i++) {
    const user = users[i];
    const currentClass = firstYearClasses[0]; // 1DA
    const preferredClass = firstYearClasses[2]; // 1DC

    await prisma.bundleSwapRequest.create({
      data: {
        userId: user.id,
        currentClassId: currentClass.id,
        preferredClassIds: [preferredClass.id],
        status: "ACTIVE",
        ticketType: "ALL_CLASSES",
        priority: 1,
        graphPartition: `year-${currentClass.year}`,
      },
    });
  }*/

  console.log("Seed data created successfully!");
  console.log(`Created ${subjects.length} subjects`);
  console.log(`Created ${classes.length} classes`);
  // console.log(`Created ${users.length + 1} users (including admin)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
