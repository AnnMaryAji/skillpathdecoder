import { describe, expect, it } from "vitest";

import {
  calculateProgress,
  generateCareerRoadmap,
  getSkillStatusMap,
  validateDAG,
  topologicalSort,
} from "./roadmap";

describe("roadmap engine", () => {
  it("builds a valid DAG for the default roadmap", () => {
    const roadmap = generateCareerRoadmap("Data Analyst", "Mid");
    const validation = validateDAG(roadmap.skills);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it("topologically sorts skills in dependency order", () => {
    const roadmap = generateCareerRoadmap("Data Analyst", "Mid");
    const order = topologicalSort(roadmap.skills);
    expect(order[0]).toBe("python_basics");
    expect(order.includes("data_analysis")).toBe(true);
  });

  it("calculates quiz-score progress and unlocked statuses deterministically", () => {
    const roadmap = generateCareerRoadmap("Data Analyst", "Mid");
    const statusMap = getSkillStatusMap(roadmap.skills, {
      python_basics: 80,
      sql_foundations: 80,
      data_analysis: 62,
      statistics: 70,
      data_visualization: 0,
      tableau_or_powerbi: 0,
      communication: 0,
      ml_foundations: 0,
      feature_engineering: 0,
      model_monitoring: 0,
      portfolio_case_study: 0,
      career_strategy: 0,
    });
    expect(statusMap.python_basics.status).toBe("mastered");
    expect(statusMap.data_analysis.status).toBe("in_progress");
    expect(calculationProgress(roadmap.skills, { python_basics: 80, sql_foundations: 80, data_analysis: 62, statistics: 70, data_visualization: 0, tableau_or_powerbi: 0, communication: 0, ml_foundations: 0, feature_engineering: 0, model_monitoring: 0, portfolio_case_study: 0, career_strategy: 0 })).toMatchObject({ percentage: 24 });
  });

  it("counts partial quiz scores toward overall progress", () => {
    const roadmap = generateCareerRoadmap("Data Analyst", "Mid");
    expect(calculateProgress(roadmap.skills, { python_basics: 60 }).percentage).toBe(5);
  });
});

function calculationProgress(skills: ReturnType<typeof generateCareerRoadmap>["skills"], confidenceBySkill: Record<string, number>) {
  return calculateProgress(skills, confidenceBySkill);
}
