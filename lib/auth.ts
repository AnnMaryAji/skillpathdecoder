import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "skillpath_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, salt, storedHex] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHex || !/^[a-f0-9]{128}$/i.test(storedHex)) {
    return false;
  }

  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(storedHex, "hex");
  return timingSafeEqual(actual, expected);
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionTokenHash(token: string) {
  return hashToken(token);
}
