import { Permutation } from "@prisma/client";

import { columns } from "./columns"
import { DataTable } from "./data-table"

// TODO: data will come from the socket server and not from the API
async function getData(): Promise<Permutation[]> {
    // Fetch data from your API here.
    return [
    
    ]
}

export default async function TicketTable() {
    const data = await getData()

    return (
        <div className="container mx-auto pt-16 py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}
