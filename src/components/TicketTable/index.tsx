import { Permutation } from "@prisma/client";

import { columns } from "./columns"
import { DataTable } from "./data-table"
import CreateTicketModal from "../CreateTicketModal/page";


async function getData(): Promise<Permutation[]> {
    // Fetch data from your API here.
    return [

    ]
}

const TicketTable: React.FC = async () => {
    const data = await getData()

    return (
        <div className="container mx-auto pt-16 py-10">
            <div className="pb-4">
                <CreateTicketModal />
            </div>
            <div>
                <DataTable columns={columns} data={data} />
            </div>
        </div>
    )
}

export default TicketTable;
