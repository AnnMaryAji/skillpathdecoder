import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { EventsClient } from "@/components/events-client";

const searchSchema = z.object({
  careerGoal: z.string().trim().min(2).max(120).optional(),
  skills: z.string().max(2000).optional(),
});

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ careerGoal?: string; skills?: string }>;
}) {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EventsContent({
  searchParams,
}: {
  searchParams: Promise<{ careerGoal?: string; skills?: string }>;
}) {
  const parsedSearch = searchSchema.safeParse(await searchParams);
  const skills = parsedSearch.success
    ? (parsedSearch.data.skills ?? "").split(",").filter(Boolean)
    : [];

  if (!parsedSearch.success || skills.length > 24 || skills.some((skill) => skill.length > 80)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-white">Invalid event filters</h1>
        <p className="mt-3 text-slate-300">Return to the dashboard and open events from your saved roadmap.</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-full bg-violet-500 px-5 py-3 font-semibold text-white">Back to dashboard</Link>
      </main>
    );
  }

  return (
    <EventsClient
      careerGoal={parsedSearch.data.careerGoal ?? "Data analyst"}
      skillIds={skills}
    />
  );
}

function EventsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Nearby events</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Loading event filters…</h1>
    </main>
  );
}
