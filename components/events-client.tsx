"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { EventRecord } from "@/lib/events";

const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  skills: z.array(z.string()),
  organizer: z.string(),
  start: z.string(),
  end: z.string(),
  registrationDeadline: z.string().optional(),
  city: z.string(),
  region: z.string(),
  country: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  online: z.boolean(),
  price: z.number().optional(),
  currency: z.string().optional(),
  url: z.string(),
  source: z.enum(["eventbrite", "meetup", "curated"]),
  verificationStatus: z.enum(["provider-confirmed", "catalog", "unverified"]),
  lastVerified: z.string(),
  onlineReason: z.string().optional(),
  distanceKm: z.number().optional(),
  relevanceScore: z.number(),
  eventType: z.enum(["workshop", "meetup", "conference", "career-fair", "seminar"]),
});
const eventResponseSchema = z.object({
  events: z.array(eventSchema),
});

type Location = {
  latitude: number;
  longitude: number;
};

export function EventsClient({
  careerGoal,
  skillIds,
}: {
  careerGoal: string;
  skillIds: string[];
}) {
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [locationState, setLocationState] = useState<"locating" | "available" | "unavailable">("locating");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!navigator.geolocation) {
        setLocationState("unavailable");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setLocationState("available");
        },
        () => setLocationState("unavailable"),
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (locationState === "locating") return;
    const controller = new AbortController();

    async function loadEvents() {
      setLoading(true);
      setError("");
      const filters = {
        careerGoal,
        skillIds,
        radiusKm: 50,
        online: true,
        inPerson: location !== null,
        minRelevance: 30,
        timezone: "UTC",
        ...(location ?? {}),
      };

      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters),
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload: unknown = await response.json();
          throw new Error(
            typeof payload === "object" && payload !== null && "error" in payload
              ? String(payload.error)
              : "Events could not be loaded.",
          );
        }
        const parsed = eventResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("The events service returned an invalid response.");
        setEvents(parsed.data.events);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Events could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadEvents();
    return () => controller.abort();
  }, [careerGoal, skillIds, location, locationState]);

  function startEventQuiz(event: EventRecord, skillId: string) {
    const params = new URLSearchParams({
      eventId: event.id,
      eventSkill: skillId,
      eventRequest: window.crypto.randomUUID(),
    });
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Nearby events</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Events for {careerGoal}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {locationState === "locating"
              ? "Finding events near your location…"
              : location
                ? "In-person events within 50 km of your location, plus online events."
                : "Location is unavailable. Showing online events only."}
          </p>
        </div>
        <nav className="flex gap-4 text-sm font-medium text-slate-300">
          <Link href="/">Overview</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/events">Events</Link>
          <Link href="/account">Account</Link>
        </nav>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <FilterPill label="Nearby radius" value="50 km" />
        <FilterPill label="In-person events" value={location ? "Near you" : "Location required"} />
        <FilterPill label="Online events" value="Included" />
      </section>

      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</p>}
      {loading ? (
        <p className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">Loading nearby events…</p>
      ) : events.length === 0 ? (
        <section className="rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-8">
          <h2 className="text-xl font-semibold text-white">No matching events yet</h2>
          <p className="mt-2 text-slate-300">There are no curated events matching {careerGoal} in this area. Online events are still included when available.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-6 shadow-sm shadow-black/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">{event.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{event.title}</h2>
                  <p className="mt-2 max-w-2xl text-slate-300">{event.description}</p>
                </div>
                <div className="rounded-2xl border border-teal-200/15 bg-teal-200/10 px-3 py-2 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-teal-200">Match</p>
                  <p className="text-xl font-bold text-teal-50">{event.relevanceScore}%</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <InfoLine label="When" value={new Date(event.start).toLocaleString()} />
                <InfoLine
                  label="Location"
                  value={event.online
                    ? "Online"
                    : `${event.city}, ${event.region}${event.distanceKm === undefined ? "" : ` · ${event.distanceKm.toFixed(1)} km away`}`}
                />
                <InfoLine label="Organizer" value={event.organizer} />
                <InfoLine label="Price" value={event.price ? `$${event.price}` : "Free"} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {event.skills.map((skillId) => (
                  <span key={skillId} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200">
                    {skillId.replace(/[_-]+/g, " ")}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href={event.url} target="_blank" rel="noreferrer" className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white">
                  Register
                </a>
                {event.skills.map((skillId) => (
                  <button
                    key={skillId}
                    type="button"
                    onClick={() => startEventQuiz(event, skillId)}
                    className="rounded-full border border-teal-200/20 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-200/10"
                  >
                    I completed it · quiz: {skillId.replace(/[_-]+/g, " ")}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100/15 bg-[#11132d]/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}
