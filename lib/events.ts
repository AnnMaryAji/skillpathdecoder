import { z } from "zod";

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  organizer: string;
  start: string;
  end: string;
  registrationDeadline?: string;
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
  online: boolean;
  price?: number;
  currency?: string;
  url: string;
  source: "eventbrite" | "meetup" | "curated";
  verificationStatus: "provider-confirmed" | "catalog" | "unverified";
  lastVerified: string;
  onlineReason?: string;
  distanceKm?: number;
  relevanceScore: number;
  eventType: "workshop" | "meetup" | "conference" | "career-fair" | "seminar";
};

export const eventPreferencesSchema = z.object({
  city: z.string().optional(),
  radiusKm: z.number().min(5).max(500).default(50),
  categories: z.array(z.string()).default([]),
  online: z.boolean().default(true),
  inPerson: z.boolean().default(true),
  maxBudget: z.number().optional(),
  minRelevance: z.number().min(0).max(100).default(30),
  timezone: z.string().default("UTC"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).superRefine((preferences, context) => {
  if ((preferences.latitude === undefined) !== (preferences.longitude === undefined)) {
    context.addIssue({
      code: "custom",
      message: "Latitude and longitude must be provided together.",
    });
  }
});

const baseEvents: EventRecord[] = [
  {
    id: "evt-01",
    title: "Python for Analytics Bootcamp",
    description: "A practical session on Python, notebook workflows, and dashboarding for data professionals.",
    category: "workshop",
    skills: ["python_basics", "data_analysis"],
    organizer: "Northwind Labs",
    start: "2026-11-02T18:00:00.000Z",
    end: "2026-11-02T21:00:00.000Z",
    registrationDeadline: "2026-10-31T23:59:00.000Z",
    city: "Seattle",
    region: "Washington",
    country: "USA",
    latitude: 47.6062,
    longitude: -122.3321,
    online: false,
    price: 25,
    currency: "USD",
    url: "https://example.com/events/python-analytics",
    source: "curated",
    verificationStatus: "catalog",
    lastVerified: "2026-10-20T12:00:00.000Z",
    relevanceScore: 94,
    eventType: "workshop",
  },
  {
    id: "evt-02",
    title: "Power BI for Storytelling",
    description: "Learn to transform raw business metrics into clear visual narratives.",
    category: "seminar",
    skills: ["data_visualization", "communication"],
    organizer: "DataBridge Forum",
    start: "2026-11-05T16:00:00.000Z",
    end: "2026-11-05T18:00:00.000Z",
    registrationDeadline: "2026-11-02T18:00:00.000Z",
    city: "Portland",
    region: "Oregon",
    country: "USA",
    latitude: 45.5152,
    longitude: -122.6784,
    online: false,
    price: 0,
    currency: "USD",
    url: "https://example.com/events/powerbi-storytelling",
    source: "eventbrite",
    verificationStatus: "provider-confirmed",
    lastVerified: "2026-10-21T10:00:00.000Z",
    relevanceScore: 88,
    eventType: "seminar",
  },
  {
    id: "evt-03",
    title: "SQL Deep Dive for Analysts",
    description: "Practice advanced joins, window functions, and performance tuning for analytical queries.",
    category: "workshop",
    skills: ["sql_foundations", "data_analysis"],
    organizer: "Analyst Guild",
    start: "2026-11-08T17:00:00.000Z",
    end: "2026-11-08T20:00:00.000Z",
    registrationDeadline: "2026-11-06T16:00:00.000Z",
    city: "Remote",
    region: "Online",
    country: "USA",
    online: true,
    onlineReason: "Remote workshop",
    price: 15,
    currency: "USD",
    url: "https://example.com/events/sql-deep-dive",
    source: "meetup",
    verificationStatus: "provider-confirmed",
    lastVerified: "2026-10-19T09:30:00.000Z",
    relevanceScore: 91,
    eventType: "workshop",
  },
  {
    id: "evt-04",
    title: "AI Product Case Club",
    description: "A mentoring meetup focused on product thinking, experimentation, and communicating impact.",
    category: "meetup",
    skills: ["communication", "model_monitoring"],
    organizer: "Signal Collective",
    start: "2026-11-10T18:30:00.000Z",
    end: "2026-11-10T20:30:00.000Z",
    city: "Austin",
    region: "Texas",
    country: "USA",
    latitude: 30.2672,
    longitude: -97.7431,
    online: false,
    price: 0,
    currency: "USD",
    url: "https://example.com/events/ai-product-case-club",
    source: "meetup",
    verificationStatus: "provider-confirmed",
    lastVerified: "2026-10-22T07:00:00.000Z",
    relevanceScore: 81,
    eventType: "meetup",
  },
  {
    id: "evt-05",
    title: "Career Fair: Data & Product",
    description: "Meet hiring teams, learn the latest role expectations, and refine your narrative.",
    category: "career-fair",
    skills: ["career_strategy", "communication"],
    organizer: "Regional Tech Council",
    start: "2026-11-15T10:00:00.000Z",
    end: "2026-11-15T15:00:00.000Z",
    city: "Denver",
    region: "Colorado",
    country: "USA",
    latitude: 39.7392,
    longitude: -104.9903,
    online: false,
    price: 0,
    currency: "USD",
    url: "https://example.com/events/career-fair-data-product",
    source: "curated",
    verificationStatus: "catalog",
    lastVerified: "2026-10-18T13:00:00.000Z",
    relevanceScore: 86,
    eventType: "career-fair",
  },
];

export function normalizeEvent(rawEvent: Partial<EventRecord>): EventRecord {
  return {
    id: rawEvent.id ?? `evt-${Math.random().toString(36).slice(2, 8)}`,
    title: rawEvent.title ?? "Untitled event",
    description: rawEvent.description ?? "No description available.",
    category: rawEvent.category ?? "workshop",
    skills: rawEvent.skills ?? [],
    organizer: rawEvent.organizer ?? "Unknown organizer",
    start: rawEvent.start ?? new Date().toISOString(),
    end: rawEvent.end ?? new Date().toISOString(),
    registrationDeadline: rawEvent.registrationDeadline,
    city: rawEvent.city ?? "Remote",
    region: rawEvent.region ?? "Online",
    country: rawEvent.country ?? "Unknown",
    latitude: rawEvent.latitude,
    longitude: rawEvent.longitude,
    online: rawEvent.online ?? false,
    price: rawEvent.price,
    currency: rawEvent.currency,
    url: rawEvent.url ?? "https://example.com",
    source: rawEvent.source ?? "curated",
    verificationStatus: rawEvent.verificationStatus ?? "unverified",
    lastVerified: rawEvent.lastVerified ?? new Date().toISOString(),
    relevanceScore: rawEvent.relevanceScore ?? 50,
    eventType: rawEvent.eventType ?? "workshop",
  };
}

export function dedupeEvents(events: EventRecord[]): EventRecord[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.source}:${event.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const latDelta = ((lat2 - lat1) * Math.PI) / 180;
  const lonDelta = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const STATIC_NOW = new Date("2026-10-24T00:00:00.000Z");

export function filterAndRankEvents(
  events: EventRecord[],
  preferences: z.infer<typeof eventPreferencesSchema>,
  userSkills: string[] = [],
  careerGoal = "Data analyst",
  referenceNow: Date = STATIC_NOW,
): EventRecord[] {
  const userLatitude = preferences.latitude;
  const userLongitude = preferences.longitude;
  const hasUserLocation = userLatitude !== undefined && userLongitude !== undefined;

  const filtered = dedupeEvents(events)
    .map((event) => {
      const distanceKm = hasUserLocation && !event.online
        && event.latitude !== undefined && event.longitude !== undefined
        ? calculateDistanceKm(userLatitude, userLongitude, event.latitude, event.longitude)
        : undefined;
      return { ...event, distanceKm };
    })
    .filter((event) => {
      if (event.online && !preferences.online) return false;
      if (!event.online && !preferences.inPerson) return false;
      if (hasUserLocation && !event.online && event.distanceKm === undefined) return false;
      if (event.distanceKm !== undefined && event.distanceKm > preferences.radiusKm) return false;
      if (preferences.maxBudget && event.price && event.price > preferences.maxBudget) return false;
      if (preferences.categories.length > 0 && !preferences.categories.includes(event.category)) return false;
      if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < referenceNow.getTime()) return false;

      return true;
    })
    .filter((event) => {
      if (userSkills.length === 0) return true;

      const skillOverlap = event.skills.some((skill) => userSkills.includes(skill));
      const goalTerms = careerGoal
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 3);
      const eventText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
      return skillOverlap || goalTerms.some((term) => eventText.includes(term));
    })
    .map((event) => {
      const skillOverlap = event.skills.filter((skill) => userSkills.includes(skill)).length;
      const goalTerms = careerGoal
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 3);
      const eventText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
      const matchedGoalTerms = goalTerms.filter((term) => eventText.includes(term)).length;
      const goalMatch = careerGoal.toLowerCase().includes("data") && skillOverlap > 0
        ? 25
        : Math.min(25, 10 + matchedGoalTerms * 5);
      const score = Math.min(100, Math.round(event.relevanceScore + skillOverlap * 12 + goalMatch));

      return {
        ...event,
        relevanceScore: score,
      };
    })
    .filter((event) => event.relevanceScore >= preferences.minRelevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return filtered;
}

export const curatedEvents = baseEvents;

export function buildMatchExplanation(event: EventRecord, careerGoal: string): string {
  return `This ${event.eventType} aligns with ${careerGoal.toLowerCase()} goals and covers ${event.skills.join(", ") || "core skills"}.`;
}

export function createNotificationEntry(event: EventRecord, userId: string, type = "new_event") {
  return {
    id: `${userId}-${event.id}-${type}`,
    userId,
    eventId: event.id,
    type,
    title: `New match: ${event.title}`,
    message: buildMatchExplanation(event, "Data analyst"),
    createdAt: new Date().toISOString(),
    read: false,
    status: "created",
  };
}
