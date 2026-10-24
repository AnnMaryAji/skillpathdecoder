import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createUserSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { authDatabaseErrorResponse } from "@/lib/auth-api-errors";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name, a valid email, and a password of at least 10 characters." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const databaseError = authDatabaseErrorResponse(error);
    if (databaseError) return databaseError;
    throw error;
  }

  let session;
  try {
    session = await createUserSession(user.id);
  } catch (error) {
    const databaseError = authDatabaseErrorResponse(error);
    if (databaseError) return databaseError;
    throw error;
  }
  const response = NextResponse.json({ user });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
