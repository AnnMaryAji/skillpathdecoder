import { NextResponse } from "next/server";
import { z } from "zod";

import { authDatabaseErrorResponse } from "@/lib/auth-api-errors";
import { createUserSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
  } catch (error) {
    const databaseError = authDatabaseErrorResponse(error);
    if (databaseError) return databaseError;
    throw error;
  }
  if (!(await verifyPassword(parsed.data.password, user?.passwordHash ?? null)) || !user) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  let session;
  try {
    session = await createUserSession(user.id);
  } catch (error) {
    const databaseError = authDatabaseErrorResponse(error);
    if (databaseError) return databaseError;
    throw error;
  }
  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
