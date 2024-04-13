"use client"

import { Permutation } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.


export const columns: ColumnDef<Permutation>[] = [
  {
    accessorKey: "turmaAtual",
    header: "Turma Atual",
  },
  {
    accessorKey: "turmaDestino",
    header: "Turma Destino",
  },
  {
    accessorKey: "cadeiras",
    header: "Cadeiras",
  },
]
