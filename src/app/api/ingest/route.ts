import { NextResponse, type NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { processIngest } from "@/lib/ingest";
import { getCollections, isDatabaseConfigured } from "@/lib/mongodb";
import { hashDeviceKey } from "@/lib/tokens";

const MAX_BODY_BYTES = 256 * 1024;

function extractKey(req: NextRequest, body: Record<string, unknown>) {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return (
    req.headers.get("x-device-key") ??
    (typeof body.deviceKey === "string" ? body.deviceKey : null) ??
    req.nextUrl.searchParams.get("key")
  );
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: "Server database is not configured." }, { status: 503 });
  }

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "Payload too large." }, { status: 413 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, message: "Body must be JSON." }, { status: 400 });
  }

  const key = extractKey(req, body);
  if (!key) {
    return NextResponse.json({ ok: false, message: "Missing device key." }, { status: 401 });
  }

  const cols = await getCollections();
  const patient = await cols.patients.findOne({ "wearable.keyHash": hashDeviceKey(key) });
  if (!patient || patient.wearable.status === "revoked") {
    return NextResponse.json({ ok: false, message: "Invalid or revoked device key." }, { status: 401 });
  }

  const firstSync = patient.wearable.status === "pending";
  const result = await processIngest(cols, patient, body, "apple_shortcuts");
  if (firstSync) {
    await logAudit(cols, "device", "device.first_sync", "patient", patient._id.toString(), patient.mrn);
  }

  const parts = [`${result.readingsStored} reading${result.readingsStored === 1 ? "" : "s"}`];
  if (result.locationStored) parts.push("location");
  return NextResponse.json({
    ok: true,
    message: `Recovery Shield synced ${parts.join(" + ")} for ${patient.firstName}.${result.alertsCreated ? ` ${result.alertsCreated} alert(s) raised.` : ""}`,
    ...result,
  });
}
