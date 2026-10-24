import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function authDatabaseErrorResponse(error: unknown) {
  const isInitializationError = error instanceof Error
    && error.name === "PrismaClientInitializationError";
  const isSchemaError = error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === "P2021" || error.code === "P2022");

  if (!isInitializationError && !isSchemaError) return null;

  console.error("Authentication database request failed", error);
  return NextResponse.json(
    {
      error: isSchemaError
        ? "Connected to Supabase, but the app tables are missing or outdated. Check DIRECT_URL and run `npx prisma migrate deploy`."
        : "Could not connect to Supabase Postgres. Verify the DATABASE_URL pooler host, port, username, and password.",
    },
    { status: 503 },
  );
}
