"use client";

import { useActionState } from "react";
import { createPatient, type ActionState } from "@/actions/patients";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function PatientForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPatient, { ok: false });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="card divide-y divide-slate-100">
      <section className="grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">Patient details</h2>
        <Field label="First name *">
          <input name="firstName" required className="input" autoComplete="off" />
        </Field>
        <Field label="Last name *">
          <input name="lastName" required className="input" autoComplete="off" />
        </Field>
        <Field label="Date of birth *">
          <input name="dateOfBirth" type="date" required max={today} className="input" />
        </Field>
        <Field label="Gender">
          <select name="gender" className="input" defaultValue="">
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
          </select>
        </Field>
        <Field label="Phone">
          <input name="phone" type="tel" className="input" />
        </Field>
      </section>

      <section className="grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">Treatment</h2>
        <Field label="Admission date *">
          <input name="admissionDate" type="date" required defaultValue={today} className="input" />
        </Field>
        <Field label="Program *">
          <select name="program" className="input" defaultValue="Residential">
            <option>Residential</option>
            <option>Intensive Outpatient (IOP)</option>
            <option>Partial Hospitalization (PHP)</option>
            <option>Outpatient</option>
            <option>Sober living</option>
          </select>
        </Field>
        <Field label="Program length (days) *">
          <input name="programLengthDays" type="number" min={1} max={730} defaultValue={30} required className="input" />
        </Field>
        <Field label="Assigned clinician">
          <input name="assignedClinician" className="input" placeholder="e.g. Dr. Sarah Lin" />
        </Field>
        <Field label="Primary concern" className="sm:col-span-2">
          <input name="primaryConcern" className="input" placeholder="Optional" />
        </Field>
      </section>

      <section className="grid gap-4 p-6 sm:grid-cols-3">
        <h2 className="text-sm font-semibold text-slate-900 sm:col-span-3">Emergency contact</h2>
        <Field label="Name">
          <input name="emergencyName" className="input" />
        </Field>
        <Field label="Phone">
          <input name="emergencyPhone" type="tel" className="input" />
        </Field>
        <Field label="Relationship">
          <input name="emergencyRelation" className="input" />
        </Field>
      </section>

      <section className="grid gap-4 p-6">
        <Field label="Notes">
          <textarea name="notes" rows={3} className="input" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" name="consentGiven" className="mt-0.5 accent-brand-600" />
          <span>Patient has given informed consent to remote biometric and location monitoring.</span>
        </label>
      </section>

      <div className="flex items-center justify-between gap-3 bg-slate-50/60 px-6 py-4">
        <p className="text-sm text-rose-600">{!state.ok && state.message}</p>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Enroll patient"}
        </button>
      </div>
    </form>
  );
}
