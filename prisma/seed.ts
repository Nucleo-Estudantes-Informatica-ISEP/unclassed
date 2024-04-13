import { PrismaClient } from "@prisma/client";

import subjects from "../data/subjects.json";

const prisma = new PrismaClient();

interface Subject {
  name: string;
  semester: number;
}

async function main() {
  const data: Subject[] = [];

  subjects.forEach((semester, i) =>
    semester.forEach((name) => data.push({ name, semester: i + 1 }))
  );

  // prisma does not support skipDuplicates in mongodb
  await Promise.all(
    data.map(async (subject) => {
      await prisma.subject.upsert({
        where: { name: subject.name },
        update: {},
        create: subject,
      });
    })
  );
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
