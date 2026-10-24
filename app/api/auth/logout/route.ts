import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionTokenHash, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.userSession.deleteMany({
      where: { tokenHash: getSessionTokenHash(token) },
    });
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
