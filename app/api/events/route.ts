import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { curatedEvents, eventPreferencesSchema, filterAndRankEvents } from "@/lib/events";

const searchSchema = eventPreferencesSchema.extend({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
  careerGoal: z.string().trim().min(2).max(120).default("Data analyst"),
  skillIds: z.array(z.string().min(1).max(80)).max(24).default([]),
});

function searchEvents(input: unknown) {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userSkills = parsed.data.skillIds.length
    ? parsed.data.skillIds
    : ["python_basics", "sql_foundations", "data_analysis", "communication"];
  const preferences = {
    ...parsed.data,
    inPerson: parsed.data.inPerson
      && parsed.data.latitude !== undefined
      && parsed.data.longitude !== undefined,
  };
  const filtered = filterAndRankEvents(curatedEvents, preferences, userSkills, parsed.data.careerGoal);
  const startIndex = (parsed.data.page - 1) * parsed.data.limit;
  const pageItems = filtered.slice(startIndex, startIndex + parsed.data.limit);

  return NextResponse.json({
    events: pageItems,
    total: filtered.length,
    page: parsed.data.page,
    limit: parsed.data.limit,
    liveSource: "Curated catalog fallback",
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return searchEvents({
    city: searchParams.get("city") ?? undefined,
    radiusKm: Number(searchParams.get("radiusKm") ?? 50),
    categories: searchParams.get("categories")?.split(",").filter(Boolean) ?? [],
    online: searchParams.get("online") !== "false",
    inPerson: searchParams.get("inPerson") !== "false",
    maxBudget: Number(searchParams.get("maxBudget") ?? ""),
    minRelevance: Number(searchParams.get("minRelevance") ?? 30),
    timezone: searchParams.get("timezone") ?? "UTC",
    latitude: searchParams.has("latitude") ? Number(searchParams.get("latitude")) : undefined,
    longitude: searchParams.has("longitude") ? Number(searchParams.get("longitude")) : undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 10),
    careerGoal: searchParams.get("careerGoal") ?? "Data analyst",
    skillIds: searchParams.get("skills")?.split(",").filter(Boolean) ?? [],
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  return searchEvents(body);
}
