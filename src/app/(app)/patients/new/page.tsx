import Link from "next/link";
import { PatientForm } from "@/components/patient-form";
import { PageHeader } from "@/components/ui";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/patients" className="text-sm text-slate-500 hover:text-slate-700">
        ← Patients
      </Link>
      <div className="mt-2">
        <PageHeader title="Enroll patient" subtitle="After enrolling, activate a wearable from the patient's page to start monitoring." />
      </div>
      <PatientForm />
    </div>
  );
}
