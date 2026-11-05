import { auth } from "@clerk/nextjs/server";
import { Activity, Bell, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500">
            <ShieldCheck className="size-5" />
          </div>
          <span className="font-semibold">Recovery Shield</span>
        </div>
        <Link href="/sign-in" className="btn-primary">
          Staff sign in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-sm font-medium tracking-wide text-brand-500 uppercase">Prototype</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Remote biometric and location monitoring for addiction treatment teams.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Apple Watch data, GPS and geofences in one secure staff dashboard, with rule-based alerts that prompt timely review.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/sign-in" className="btn-primary px-5 py-2.5">
            Open dashboard
          </Link>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Activity, title: "Wearable vitals", body: "Heart rate, HRV, sleep and activity from Apple Watch via HealthKit." },
            { icon: MapPin, title: "Location & geofences", body: "Latest location, history trail, safe zones and restricted areas." },
            { icon: Bell, title: "Rule-based alerts", body: "Configurable thresholds with acknowledge and resolve workflow." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <Icon className="size-5 text-brand-500" />
              <div className="mt-3 font-medium">{title}</div>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="px-6 py-6 text-center text-xs text-slate-500">
        Prototype. Not for diagnosis or emergency response. Do not enter real patient information in demo environments.
      </footer>
    </div>
  );
}
