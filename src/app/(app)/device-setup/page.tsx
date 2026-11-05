import { headers } from "next/headers";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { Card, CardHeader, PageHeader } from "@/components/ui";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{n}</div>
      <div className="min-w-0 flex-1 pb-6">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="mt-1.5 space-y-2 text-sm text-slate-600">{children}</div>
      </div>
    </li>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 pr-20 text-xs leading-relaxed text-slate-100">{children}</pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

const FIELDS: [string, string, string][] = [
  ["deviceKey", "Text", "The key issued on the patient's page (or send it as an Authorization: Bearer header)"],
  ["heartRate", "Number", "Latest heart rate sample, bpm"],
  ["restingHeartRate", "Number", "Latest resting heart rate, bpm"],
  ["hrv", "Number", "Latest heart rate variability (SDNN), ms"],
  ["spo2", "Number", "Latest blood oxygen, % or 0–1 (not available on Apple Watch SE)"],
  ["steps", "Number", "Total steps today"],
  ["activeEnergy", "Number", "Active energy today, kcal"],
  ["sleepHours / sleepMinutes", "Number", "Sleep last night"],
  ["latitude, longitude, accuracy", "Number", "From Get Current Location"],
  ["heartRateAt, locationAt, recordedAt", "Text", "Optional ISO 8601 timestamps (Format Date → ISO 8601). Defaults to now."],
  ["deviceLabel", "Text", 'Optional, e.g. "Apple Watch SE"'],
];

export default async function DeviceSetupPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") ? process.env.NEXT_PUBLIC_APP_URL : `${proto}://${host}`;
  const endpoint = `${origin.replace(/\/$/, "")}/api/ingest`;
  const shortcutUrl = process.env.NEXT_PUBLIC_SHORTCUT_URL;

  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceKey": "RS-XXXX-XXXX-XXXX-XXXX-XXXX",
    "heartRate": 78,
    "hrv": 45,
    "steps": 4120,
    "latitude": 30.2672,
    "longitude": -97.7431,
    "deviceLabel": "Apple Watch SE"
  }'`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Device setup: Apple Watch + iPhone"
        subtitle="Apple Watch data lives in Apple Health on the paired iPhone. An iOS Shortcut reads the latest values and the phone's GPS, then posts them to Recovery Shield."
      />

      <Card>
        <CardHeader title="Ingestion endpoint" subtitle="The iPhone sends data here" />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm break-all text-slate-800">POST {endpoint}</code>
          <CopyButton text={endpoint} label="Copy URL" />
        </div>
        {endpoint.includes("localhost") && (
          <p className="mx-5 mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Your iPhone can&apos;t reach localhost. Deploy to Netlify first (or expose your dev server with a tunnel such as ngrok) and use that URL in the Shortcut.
          </p>
        )}
      </Card>

      {shortcutUrl && (
        <Card>
          <CardHeader title="Install the Recovery Shield Shortcut" subtitle="Scan with the patient's iPhone camera" />
          <div className="flex flex-wrap items-center gap-6 p-5">
            <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
              <QRCodeSVG value={shortcutUrl} size={140} />
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>1. Scan this code and tap <strong>Add Shortcut</strong>.</p>
              <p>2. When prompted, paste the device key from the patient&apos;s page.</p>
              <p>3. Run it once and allow Health and Location access.</p>
              <a href={shortcutUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                Open iCloud link
              </a>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Build the Shortcut (one time, on your iPhone)" subtitle="About 10 minutes. Afterwards, share it as an iCloud link so other patients can install it." />
        <ol className="p-6">
          <Step n={1} title="Prepare the iPhone">
            <p>
              Make sure the Apple Watch is paired and syncing to the <strong>Health</strong> app. Open <strong>Shortcuts</strong> → <strong>+</strong> → name it <em>Recovery Shield Sync</em>.
            </p>
          </Step>
          <Step n={2} title="Store the device key">
            <p>
              Add a <strong>Text</strong> action and paste the device key. Then add <strong>Set Variable</strong> → name <code>DeviceKey</code>.
            </p>
          </Step>
          <Step n={3} title="Read the latest heart rate">
            <p>
              Add <strong>Find Health Samples</strong>: <em>Type is Heart Rate</em>, Sort by <em>Start Date</em>, Order <em>Latest First</em>, Limit <em>1</em>. Add <strong>Get Details of Health Sample</strong> → <em>Value</em>, then <strong>Set Variable</strong> <code>HeartRate</code>.
            </p>
            <p>
              Repeat for <em>Resting Heart Rate</em> → <code>RestingHR</code> and <em>Heart Rate Variability</em> → <code>HRV</code>. Skip <em>Blood Oxygen</em> on Apple Watch SE because it has no SpO₂ sensor.
            </p>
          </Step>
          <Step n={4} title="Read today's steps">
            <p>
              <strong>Find Health Samples</strong>: <em>Type is Steps</em>, <em>Start Date is Today</em>. Add <strong>Calculate Statistics</strong> → <em>Sum</em>, then <strong>Set Variable</strong> <code>Steps</code>.
            </p>
          </Step>
          <Step n={5} title="Get the location">
            <p>
              Add <strong>Get Current Location</strong>. You&apos;ll pick its <em>Latitude</em> and <em>Longitude</em> in the next step.
            </p>
          </Step>
          <Step n={6} title="Send to Recovery Shield">
            <p>
              Add <strong>Get Contents of URL</strong> with the endpoint above. Tap <em>Show More</em>: Method <strong>POST</strong>, Request Body <strong>JSON</strong>. Add these <em>Text</em> fields:
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>
                <code>deviceKey</code> → DeviceKey
              </li>
              <li>
                <code>heartRate</code> → HeartRate, <code>restingHeartRate</code> → RestingHR, <code>hrv</code> → HRV, <code>steps</code> → Steps
              </li>
              <li>
                <code>latitude</code> → Current Location → <em>Latitude</em>; <code>longitude</code> → Current Location → <em>Longitude</em>
              </li>
              <li>
                <code>deviceLabel</code> → <em>Apple Watch SE</em>
              </li>
            </ul>
          </Step>
          <Step n={7} title="Show the result">
            <p>
              Add <strong>Get Dictionary Value</strong> → key <code>message</code>, then <strong>Show Notification</strong> with that value. Run the shortcut and allow Health and Location access when asked. You should see “Recovery Shield synced …”.
            </p>
          </Step>
          <Step n={8} title="Automate it">
            <p>
              Shortcuts → <strong>Automation</strong> → <strong>+</strong>. Good triggers for the prototype:
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>
                <strong>Time of Day</strong>: create a few (e.g. every 2 hours) and set <em>Run Immediately</em>.
              </li>
              <li>
                <strong>Arrive / Leave</strong> a location: sends a fresh location when the patient moves.
              </li>
              <li>
                <strong>App</strong> → when Health or Fitness is opened; <strong>Charger</strong> connected.
              </li>
            </ul>
          </Step>
          <Step n={9} title="Share it with other patients">
            <p>
              Long-press the shortcut → <strong>Share</strong> → <strong>Copy iCloud Link</strong>. Before sharing, open the shortcut&apos;s settings → <strong>Setup</strong> and add an <em>Import Question</em> for the Text action, so each patient pastes their own key on install. Put the link in <code>NEXT_PUBLIC_SHORTCUT_URL</code> to show an install QR code on this page.
            </p>
          </Step>
        </ol>
      </Card>

      <Card>
        <CardHeader title="Payload reference" subtitle="All fields are optional except the device key. Empty values are ignored." />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="th">Field</th>
                <th className="th">Type</th>
                <th className="th">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FIELDS.map(([f, t, d]) => (
                <tr key={f}>
                  <td className="td font-mono text-xs">{f}</td>
                  <td className="td text-xs">{t}</td>
                  <td className="td text-xs text-slate-500">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-medium text-slate-500">Test from a terminal (replace the key):</p>
          <Code>{curl}</Code>
        </div>
      </Card>

      <Card>
        <CardHeader title="Known limitations of the prototype bridge" />
        <ul className="list-disc space-y-1.5 py-4 pr-5 pl-10 text-sm text-slate-600">
          <li>Updates are near real time: every run of the Shortcut, not continuous streaming. Apple Watch itself syncs to the iPhone in batches.</li>
          <li>iOS protects Health data while the iPhone is locked, so automations that run while it&apos;s locked may send location only.</li>
          <li>Time-of-day automations run at fixed times; there is no &quot;every 15 minutes&quot; trigger in Shortcuts.</li>
          <li>Apple Watch SE has no blood-oxygen sensor; SpO₂ will show as unsupported.</li>
          <li>Phase 1 replaces this bridge with a native iOS app (HealthKit background delivery and CoreLocation geofencing) distributed via TestFlight.</li>
        </ul>
      </Card>
    </div>
  );
}
