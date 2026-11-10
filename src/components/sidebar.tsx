"use client";

import { UserButton } from "@clerk/nextjs";
import clsx from "clsx";
import { Bell, ClipboardList, LayoutDashboard, Settings, ShieldCheck, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePendingPath } from "@/components/pending-path";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/device-setup", label: "Device setup", icon: Smartphone },
  { href: "/settings", label: "Alert rules", icon: Settings },
  { href: "/audit", label: "Audit log", icon: ClipboardList },
];

export function Sidebar({ staffName, role, activeAlerts }: { staffName: string; role: string; activeAlerts: number }) {
  const pathname = usePathname();
  const pendingPath = usePendingPath();
  return (
    <aside className="flex w-full shrink-0 flex-col bg-slate-950 text-slate-300 lg:sticky lg:top-0 lg:h-screen lg:w-60">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Recovery Shield</div>
          <div className="text-[11px] text-slate-500">Prototype</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const pending = pendingPath === href || pendingPath?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-busy={pending || undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition",
                active || pending ? "bg-white/10 font-medium text-white" : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {pending ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              ) : (
                href === "/alerts" &&
                activeAlerts > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{activeAlerts}</span>
                )
              )}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center gap-3 border-t border-white/10 px-5 py-4 lg:flex">
        <UserButton />
        <div className="min-w-0">
          <div className="truncate text-sm text-white">{staffName}</div>
          <div className="text-[11px] text-slate-500 capitalize">{role}</div>
        </div>
      </div>
    </aside>
  );
}
