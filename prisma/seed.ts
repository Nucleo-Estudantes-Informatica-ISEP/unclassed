import { PrismaClient } from "@prisma/client";

import subjects from "../data/subjects.json";

const prisma = new PrismaClient();

interface Subject {
  name: string;
  year: number;
  semester: number;
  courseId: string;
}

async function createCourse(): Promise<string> {
  const course = await prisma.course.create({
    data: {
      name: "Licenciatura em Engenharia Informática",
    },
  });

  return course.id;
}

async function createClasses(courseId: string): Promise<void> {
  let name: string;

  const letters = Array.from({ length: 11 }, (_, i) => ({
    name: String.fromCharCode(65 + i), // 65 is the ASCII code for 'A'
    courseId,
  }));

  letters.map(async (classLetter) => {
    for (let i = 1; i <= 3; i++) {
      name = `${i}D${classLetter.name}`;

      await prisma.class.create({
        data: {
          name,
          courseId,
        },
      });
    }
  });

  letters.map(async (classLetter) => {
    for (let i = 1; i <= 3; i++) {
      name = `${i}N${classLetter.name}`;

      await prisma.class.create({
        data: {
          name,
          courseId,
        },
      });
    }
  });
}

async function main() {
  const data: Subject[] = [];

  let semesterNumber: number;
  let year: number;

  const courseId = await createCourse();
  await createClasses(courseId);

  subjects.forEach((semester, i) => {
    semesterNumber = i + 1;
    year = Math.ceil(semesterNumber / 2);

    semester.forEach((name) =>
      data.push({
        name,
        year: year,
        semester: semesterNumber,
        courseId,
      })
    );
  });

  await Promise.all(
    data.map(async (subject) => {
      await prisma.subject.create({
        data: subject,
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
