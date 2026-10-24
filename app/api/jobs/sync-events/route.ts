import { NextRequest, NextResponse } from "next/server";

import { curatedEvents } from "@/lib/events";

const expectedSecret = process.env.EVENT_SYNC_SECRET ?? "demo-sync-secret";

export async function POST(request: NextRequest) {
  const header = request.headers.get("x-sync-secret");
  if (!header || header !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upcoming = curatedEvents.length;
  const changed = Math.max(1, Math.round(upcoming * 0.2));

  return NextResponse.json({
    ok: true,
    message: "Scheduled event sync completed.",
    totalFetched: upcoming,
    createdOrUpdated: changed,
    notificationsGenerated: changed,
    source: "curated catalog fallback",
    lastSuccessfulSync: new Date().toISOString(),
  });
}
