"use client";

import { Ticket } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "currentClassId",
    header: "Turma Atual",
  },
  {
    accessorKey: "interestedClassIds",
    header: "Turma Destino",
  },
  {
    accessorKey: "subjectIds",
    header: "Cadeiras",
  },
];
