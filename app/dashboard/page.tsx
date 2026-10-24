import { Suspense } from "react";

import { DashboardClient } from "@/components/dashboard-client";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; eventSkill?: string; eventRequest?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; eventSkill?: string; eventRequest?: string }>;
}) {
  const { eventId, eventSkill, eventRequest } = await searchParams;
  return <DashboardClient eventId={eventId} eventSkill={eventSkill} eventRequest={eventRequest} />;
}

function DashboardLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8">
      <p className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">Loading your dashboard…</p>
    </main>
  );
}
