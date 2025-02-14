import CreateTicketModal from "../CreateTicketModal";
import { columns } from "./columns";
import { DataTable } from "./data-table";

async function getData() {
  // Fetch data from your API here.
  return [];
}

const TicketTable: React.FC = async () => {
  const data = await getData();

  return (
    <div className="container mx-auto py-10 pt-16">
      <div className="pb-4">
        <CreateTicketModal />
      </div>
      <div>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default TicketTable;
