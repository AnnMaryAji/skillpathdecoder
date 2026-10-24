import { describe, expect, it } from "vitest";

import { curatedEvents, filterAndRankEvents } from "./events";

const preferences = {
  radiusKm: 500,
  categories: [],
  online: true,
  inPerson: true,
  minRelevance: 30,
  timezone: "UTC",
};

describe("career-aware event matching", () => {
  it("keeps curated events aligned with skills or the selected career", () => {
    const dataEvents = filterAndRankEvents(
      curatedEvents,
      preferences,
      ["python_basics", "data_analysis", "sql_foundations"],
      "Data Analyst",
    );
    const designEvents = filterAndRankEvents(
      curatedEvents,
      preferences,
      ["ux_research", "interaction_design"],
      "UX Designer",
    );

    expect(dataEvents.length).toBeGreaterThan(0);
    expect(designEvents).toHaveLength(0);
  });

  it("ranks in-person events by the user's coordinates instead of a fixed city", () => {
    const nearby = filterAndRankEvents(
      curatedEvents,
      {
        ...preferences,
        radiusKm: 50,
        latitude: 45.5152,
        longitude: -122.6784,
      },
      ["data_visualization", "communication"],
      "Data Analyst",
    );

    expect(nearby.map((event) => event.id)).toContain("evt-02");
    expect(nearby.find((event) => event.id === "evt-02")?.distanceKm).toBe(0);
    expect(nearby.some((event) => event.id === "evt-01")).toBe(false);
  });
});
