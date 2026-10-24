import { NextRequest, NextResponse } from "next/server";

import { demoNotifications } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const notifications = unreadOnly ? demoNotifications.filter((item) => !item.readAt) : demoNotifications;

  return NextResponse.json({
    notifications,
    unreadCount: demoNotifications.filter((item) => !item.readAt).length,
  });
}
