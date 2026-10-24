import { describe, expect, it } from "vitest";

import { validateDAG } from "./roadmap";
import {
  createRoleBasedRoadmap,
  parseGeneratedRoadmap,
} from "./roadmap-generator";

describe("role-based roadmap generation", () => {
  it("generates valid and meaningfully different paths for arbitrary roles", () => {
    const designer = createRoleBasedRoadmap("UX Designer", "Entry");
    const analyst = createRoleBasedRoadmap("Data Analyst", "Mid");
    const policyAnalyst = createRoleBasedRoadmap("Climate Policy Analyst", "Entry");
    const machineLearningEngineer = createRoleBasedRoadmap("Machine Learning Engineer", "Mid");
    const securityAnalyst = createRoleBasedRoadmap("Cybersecurity Analyst", "Mid");

    expect(designer.career_goal).toBe("UX Designer");
    expect(designer.target_level).toBe("Entry");
    expect(validateDAG(designer.skills).valid).toBe(true);
    expect(validateDAG(analyst.skills).valid).toBe(true);
    expect(designer.skills.map((skill) => skill.skill_name)).not.toEqual(
      analyst.skills.map((skill) => skill.skill_name),
    );
    expect(designer.skills.some((skill) => skill.skill_name.includes("User research"))).toBe(true);
    expect(analyst.skills.some((skill) => skill.skill_name.includes("Data tooling"))).toBe(true);
    expect(policyAnalyst.skills.some((skill) => skill.skill_name.includes("Policy frameworks"))).toBe(true);
    expect(machineLearningEngineer.skills.some((skill) => skill.skill_name.includes("Data tooling"))).toBe(true);
    expect(securityAnalyst.skills.some((skill) => skill.skill_name.includes("Networks"))).toBe(true);
  });

  it("rejects generated roadmaps with missing prerequisite IDs", () => {
    const roadmap = createRoleBasedRoadmap("Product Manager");
    const invalidSkills = roadmap.skills.map((skill, index) => (
      index === 1 ? { ...skill, prerequisites: ["missing_skill"] } : skill
    ));

    expect(() => parseGeneratedRoadmap("Product Manager", "Mid", { skills: invalidSkills })).toThrow(
      /invalid prerequisites/i,
    );
  });

  it("parses the JSON object shape returned by the AI prompt", () => {
    const roadmap = createRoleBasedRoadmap("UX Designer");
    const parsed = parseGeneratedRoadmap("UX Designer", "Mid", { skills: roadmap.skills });

    expect(parsed.skills).toHaveLength(8);
    expect(validateDAG(parsed.skills).valid).toBe(true);
  });
});
