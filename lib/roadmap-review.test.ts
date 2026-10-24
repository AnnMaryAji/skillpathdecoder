import { describe, expect, it } from "vitest";

import { mergeRoadmapAdditions } from "./roadmap-review";
import { generateCareerRoadmap, type Skill } from "./roadmap";

describe("scheduled roadmap reviews", () => {
  it("appends new skills without changing the existing path", () => {
    const roadmap = generateCareerRoadmap("Java Developer");
    const newSkill: Skill = {
      skill_id: "modern_java_modules",
      skill_name: "Modern Java modules",
      category: "Technical",
      description: "Use the Java module system to structure and maintain larger applications.",
      prerequisites: [roadmap.skills[0].skill_id],
      estimated_hours: 6,
      parallel_group_id: "tooling",
    };

    const updated = mergeRoadmapAdditions(roadmap, [newSkill]);

    expect(updated.skills.slice(0, roadmap.skills.length)).toEqual(roadmap.skills);
    expect(updated.skills.at(-1)).toEqual(newSkill);
  });

  it("rejects additions with duplicate IDs or missing prerequisites", () => {
    const roadmap = generateCareerRoadmap("Java Developer");
    const invalidSkill: Skill = {
      skill_id: "new_java_library",
      skill_name: "New Java library",
      category: "Technical",
      description: "Evaluate and use an important recently released Java library.",
      prerequisites: ["not_in_the_roadmap"],
      estimated_hours: 4,
      parallel_group_id: "tooling",
    };

    expect(() => mergeRoadmapAdditions(roadmap, [invalidSkill])).toThrow(/unknown prerequisite/);
    expect(() => mergeRoadmapAdditions(roadmap, [invalidSkill, invalidSkill])).toThrow(/duplicate skill IDs/);
  });
});
