import { UserPlus } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { PatientsTable } from "@/components/patients-table";
import { PageHeader } from "@/components/ui";
import { listPatients } from "@/lib/queries";

export default async function PatientsPage(props: PageProps<"/patients">) {
  const { filter } = await props.searchParams;
  const rows = await listPatients();
  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={`${rows.length} enrolled · ${rows.filter((r) => r.wearableStatus === "active").length} with an active wearable`}
        action={
          <div className="flex items-center gap-3">
            <AutoRefresh />
            <Link href="/patients/new" className="btn-primary">
              <UserPlus className="size-4" /> Add patient
            </Link>
          </div>
        }
      />
      <PatientsTable rows={rows} initialFilter={typeof filter === "string" ? filter : undefined} />
    </>
  );
}
