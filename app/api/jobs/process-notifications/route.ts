import { NextRequest, NextResponse } from "next/server";

import { demoNotifications } from "@/lib/notifications";

const expectedSecret = process.env.EVENT_SYNC_SECRET ?? "demo-sync-secret";

export async function POST(request: NextRequest) {
  const header = request.headers.get("x-sync-secret");
  if (!header || header !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    processed: demoNotifications.length,
    created: demoNotifications.filter((item) => item.status === "created").length,
    read: demoNotifications.filter((item) => item.status === "read").length,
    timestamp: new Date().toISOString(),
  });
}
