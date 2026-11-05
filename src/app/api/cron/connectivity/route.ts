import { NextResponse, type NextRequest } from "next/server";
import { runConnectivityCheck } from "@/lib/alerts";
import { getCollections, isDatabaseConfigured } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: "Database not configured." }, { status: 503 });
  }
  const created = await runConnectivityCheck(await getCollections());
  return NextResponse.json({ ok: true, alertsCreated: created });
}
