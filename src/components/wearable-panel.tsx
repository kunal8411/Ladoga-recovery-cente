"use client";

import { Watch } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useActionState, useState } from "react";
import { activateWearable, revokeWearable, sendSimulatedData, type ActivateState } from "@/actions/devices";
import type { WearableStatus } from "@/lib/types";
import { CopyButton } from "./copy-button";
import { RelativeTime } from "./time";
import { WearableBadge } from "./ui";

interface Props {
  patientId: string;
  firstName: string;
  status: WearableStatus;
  online: boolean;
  deviceLabel?: string;
  lastSyncAt?: string;
  activatedAt?: string;
  keyHint?: string;
  source?: string;
  consentGiven: boolean;
}

function ActivateForm({ patientId, consentGiven, label }: { patientId: string; consentGiven: boolean; label: string }) {
  const [state, action, pending] = useActionState<ActivateState, FormData>(activateWearable, { ok: false });

  if (state.ok && state.deviceKey) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
        <p className="text-sm font-semibold text-brand-900">Device key issued. It&apos;s shown only once.</p>
        <p className="mt-1 text-xs text-slate-600">Paste it into the Recovery Shield Shortcut on the patient&apos;s iPhone, or scan the QR code with the iPhone camera and tap Copy.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
            <QRCodeSVG value={state.deviceKey} size={132} />
          </div>
          <div className="space-y-2">
            <code className="block rounded-md bg-white px-3 py-2 font-mono text-sm font-semibold tracking-wider text-slate-900 ring-1 ring-slate-200">{state.deviceKey}</code>
            <div className="flex gap-2">
              <CopyButton text={state.deviceKey} />
              <Link href="/device-setup" className="btn-secondary btn-sm">
                iPhone setup guide →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="block">
        <span className="label">Device</span>
        <input name="deviceLabel" defaultValue="Apple Watch SE + iPhone 14" className="input" />
      </label>
      {!consentGiven && (
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input type="checkbox" name="consent" className="mt-0.5 accent-brand-600" />
          Patient has consented to remote biometric and location monitoring.
        </label>
      )}
      {!state.ok && state.message && <p className="text-xs text-rose-600">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">
        <Watch className="size-4" /> {pending ? "Issuing key…" : label}
      </button>
    </form>
  );
}

export function WearablePanel(p: Props) {
  const [showReissue, setShowReissue] = useState(false);
  const paired = p.status === "active" || p.status === "pending";

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <WearableBadge status={p.status} online={p.online} />
        {paired && p.source && <span className="text-xs text-slate-400">via {p.source === "apple_shortcuts" ? "iOS Shortcuts" : p.source}</span>}
      </div>

      {paired && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Device</dt>
            <dd className="font-medium text-slate-800">{p.deviceLabel ?? "Apple Watch"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Last sync</dt>
            <dd className="font-medium text-slate-800">
              <RelativeTime iso={p.lastSyncAt} fallback="Waiting for first sync" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Activated</dt>
            <dd className="text-slate-700">
              <RelativeTime iso={p.activatedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Device key</dt>
            <dd className="font-mono text-slate-700">••••{p.keyHint}</dd>
          </div>
        </dl>
      )}

      {p.status === "pending" && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Waiting for {p.firstName}&apos;s iPhone to send its first update. Run the Recovery Shield Shortcut once to complete pairing.
        </p>
      )}

      {!paired && <ActivateForm patientId={p.patientId} consentGiven={p.consentGiven} label={p.status === "revoked" ? "Issue new device key" : "Activate wearable"} />}

      {paired && (
        <>
          {showReissue ? (
            <ActivateForm patientId={p.patientId} consentGiven={p.consentGiven} label="Issue new key (old key stops working)" />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowReissue(true)} className="btn-secondary btn-sm">
                Re-issue key
              </button>
              <form action={revokeWearable}>
                <input type="hidden" name="patientId" value={p.patientId} />
                <button className="btn-danger btn-sm">Revoke device</button>
              </form>
            </div>
          )}
          <details className="rounded-lg border border-dashed border-slate-200 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-slate-500">Test without the watch (sends simulated data)</summary>
            <form className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="patientId" value={p.patientId} />
              <button formAction={sendSimulatedData} name="scenario" value="normal" className="btn-secondary btn-sm">
                Normal reading
              </button>
              <button formAction={sendSimulatedData} name="scenario" value="high_hr" className="btn-secondary btn-sm">
                High heart rate
              </button>
              <button formAction={sendSimulatedData} name="scenario" value="low_hr" className="btn-secondary btn-sm">
                Low heart rate
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
