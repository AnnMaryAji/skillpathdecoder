export type SkillCategory = "Technical" | "Conceptual" | "Practical/Portfolio";

export type Skill = {
  skill_id: string;
  skill_name: string;
  category: SkillCategory;
  description: string;
  prerequisites: string[];
  estimated_hours: number;
  parallel_group_id: string;
};

export type Roadmap = {
  career_goal: string;
  target_level: "Entry" | "Mid" | "Senior";
  skills: Skill[];
};

export type SkillStatus = "mastered" | "in_progress" | "unlocked" | "blocked" | "not_started";

export type SkillStatusEntry = {
  status: SkillStatus;
  confidence: number;
  depth: number;
  mastered: boolean;
  unlocked: boolean;
  blocked: boolean;
};

export function generateCareerRoadmap(
  careerGoal: string,
  targetLevel: Roadmap["target_level"] = "Mid",
): Roadmap {
  const roadmapSkills: Skill[] = [
    {
      skill_id: "python_basics",
      skill_name: "Python fundamentals",
      category: "Technical",
      description: "Build confidence with core Python syntax, data structures, and functions.",
      prerequisites: [],
      estimated_hours: 12,
      parallel_group_id: "foundation",
    },
    {
      skill_id: "sql_foundations",
      skill_name: "SQL foundations",
      category: "Technical",
      description: "Learn query design, filtering, joins, and aggregation for analysis work.",
      prerequisites: [],
      estimated_hours: 10,
      parallel_group_id: "data-core",
    },
    {
      skill_id: "data_analysis",
      skill_name: "Data analysis",
      category: "Technical",
      description: "Interpret trends, summarize metrics, and communicate analytical insights.",
      prerequisites: ["python_basics", "sql_foundations"],
      estimated_hours: 18,
      parallel_group_id: "analysis",
    },
    {
      skill_id: "statistics",
      skill_name: "Statistics and experimentation",
      category: "Conceptual",
      description: "Understand variance, sampling, hypothesis tests, and basic experimentation.",
      prerequisites: ["python_basics"],
      estimated_hours: 14,
      parallel_group_id: "analysis",
    },
    {
      skill_id: "data_visualization",
      skill_name: "Data visualization",
      category: "Practical/Portfolio",
      description: "Create clear charts and dashboards for decision-making audiences.",
      prerequisites: ["data_analysis"],
      estimated_hours: 16,
      parallel_group_id: "portfolio",
    },
    {
      skill_id: "tableau_or_powerbi",
      skill_name: "BI tooling",
      category: "Technical",
      description: "Use a modern BI toolkit to build dashboards and KPIs for stakeholders.",
      prerequisites: ["data_visualization"],
      estimated_hours: 12,
      parallel_group_id: "portfolio",
    },
    {
      skill_id: "communication",
      skill_name: "Stakeholder communication",
      category: "Conceptual",
      description: "Translate technical insight into business-ready recommendations.",
      prerequisites: ["data_analysis"],
      estimated_hours: 10,
      parallel_group_id: "business",
    },
    {
      skill_id: "ml_foundations",
      skill_name: "Machine learning foundations",
      category: "Technical",
      description: "Learn feature engineering, model evaluation, and bias-aware experimentation.",
      prerequisites: ["statistics", "python_basics"],
      estimated_hours: 20,
      parallel_group_id: "ml",
    },
    {
      skill_id: "feature_engineering",
      skill_name: "Feature engineering",
      category: "Technical",
      description: "Prepare, transform, and validate the inputs that drive better models.",
      prerequisites: ["ml_foundations"],
      estimated_hours: 14,
      parallel_group_id: "ml",
    },
    {
      skill_id: "model_monitoring",
      skill_name: "Model monitoring and governance",
      category: "Conceptual",
      description: "Track model health, drift, and risk during real-world deployment use.",
      prerequisites: ["ml_foundations"],
      estimated_hours: 12,
      parallel_group_id: "ml",
    },
    {
      skill_id: "portfolio_case_study",
      skill_name: "Portfolio case studies",
      category: "Practical/Portfolio",
      description: "Package insights into an interview-ready portfolio with measurable impact.",
      prerequisites: ["data_visualization", "feature_engineering"],
      estimated_hours: 16,
      parallel_group_id: "portfolio",
    },
    {
      skill_id: "career_strategy",
      skill_name: "Career positioning",
      category: "Conceptual",
      description: "Position your experience, apply to role-aligned opportunities, and map skills to roles.",
      prerequisites: ["communication", "portfolio_case_study"],
      estimated_hours: 8,
      parallel_group_id: "career",
    },
  ];

  return {
    career_goal: careerGoal || "Data analyst",
    target_level: targetLevel,
    skills: roadmapSkills,
  };
}

export function getSkillMap(skills: Skill[]): Map<string, Skill> {
  return new Map(skills.map((skill) => [skill.skill_id, skill]));
}

export function validateDAG(skills: Skill[]): { valid: boolean; issues: string[] } {
  const issueList: string[] = [];
  const skillMap = getSkillMap(skills);

  for (const skill of skills) {
    for (const prerequisite of skill.prerequisites) {
      if (!skillMap.has(prerequisite)) {
        issueList.push(`Skill "${skill.skill_id}" references missing prerequisite "${prerequisite}".`);
      }
    }
  }

  const state = new Map<string, "visiting" | "visited">();

  const visit = (skillId: string): boolean => {
    const current = state.get(skillId);
    if (current === "visiting") {
      issueList.push(`Cycle detected involving skill "${skillId}".`);
      return false;
    }
    if (current === "visited") {
      return true;
    }

    state.set(skillId, "visiting");
    const skill = skillMap.get(skillId);
    if (!skill) {
      return false;
    }

    for (const prerequisite of skill.prerequisites) {
      if (!visit(prerequisite)) {
        return false;
      }
    }

    state.set(skillId, "visited");
    return true;
  };

  for (const skill of skills) {
    visit(skill.skill_id);
  }

  return {
    valid: issueList.length === 0,
    issues: issueList,
  };
}

export function topologicalSort(skills: Skill[]): string[] {
  const skillMap = getSkillMap(skills);
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const skill of skills) {
    indegree.set(skill.skill_id, 0);
    dependents.set(skill.skill_id, []);
  }

  for (const skill of skills) {
    for (const prerequisite of skill.prerequisites) {
      if (!skillMap.has(prerequisite)) {
        continue;
      }
      indegree.set(skill.skill_id, (indegree.get(skill.skill_id) ?? 0) + 1);
      dependents.get(prerequisite)?.push(skill.skill_id);
    }
  }

  const queue = [...skills]
    .filter((skill) => (indegree.get(skill.skill_id) ?? 0) === 0)
    .sort((a, b) => a.skill_name.localeCompare(b.skill_name))
    .map((skill) => skill.skill_id);

  const order: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    order.push(currentId);

    for (const dependent of dependents.get(currentId) ?? []) {
      indegree.set(dependent, (indegree.get(dependent) ?? 0) - 1);
      if ((indegree.get(dependent) ?? 0) === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }

  return order;
}

export function calculateGraphDepth(skillId: string, skills: Skill[]): number {
  const skillMap = getSkillMap(skills);
  const seen = new Map<string, number>();

  const depth = (currentId: string): number => {
    if (seen.has(currentId)) return seen.get(currentId) ?? 0;
    const skill = skillMap.get(currentId);
    if (!skill) return 0;
    if (skill.prerequisites.length === 0) {
      seen.set(currentId, 0);
      return 0;
    }

    const maxPrereqDepth = Math.max(
      ...skill.prerequisites.map((prereq) => depth(prereq) + 1),
    );

    seen.set(currentId, maxPrereqDepth);
    return maxPrereqDepth;
  };

  return depth(skillId);
}

export function getSkillStatusMap(
  skills: Skill[],
  confidenceBySkill: Record<string, number>,
): Record<string, SkillStatusEntry> {
  return Object.fromEntries(
    skills.map((skill) => {
      const confidence = confidenceBySkill[skill.skill_id] ?? 0;
      const prerequisitesMastered = skill.prerequisites.every(
        (prerequisiteId) => (confidenceBySkill[prerequisiteId] ?? 0) >= 80,
      );
      const hasBlockedPrereq = skill.prerequisites.some(
        (prerequisiteId) => (confidenceBySkill[prerequisiteId] ?? 0) < 80,
      );

      let status: SkillStatus = "not_started";
      if (confidence >= 80) {
        status = "mastered";
      } else if (confidence > 0 && confidence < 80 && prerequisitesMastered) {
        status = "in_progress";
      } else if (confidence === 0 && prerequisitesMastered) {
        status = "not_started";
      } else if (hasBlockedPrereq) {
        status = "blocked";
      } else if (prerequisitesMastered && confidence < 80) {
        status = "unlocked";
      }

      const entry: SkillStatusEntry = {
        status,
        confidence,
        depth: calculateGraphDepth(skill.skill_id, skills),
        mastered: status === "mastered",
        unlocked: status === "unlocked",
        blocked: status === "blocked",
      };

      return [skill.skill_id, entry];
    }),
  );
}

export function calculateProgress(skills: Skill[], confidenceBySkill: Record<string, number>) {
  const statusMap = getSkillStatusMap(skills, confidenceBySkill);
  const values = Object.values(statusMap);
  const computed = values.filter((entry) => entry.status === "mastered").length;
  const total = values.length;
  const mastery = total
    ? Math.round(values.reduce((sum, entry) => sum + entry.confidence, 0) / total)
    : 0;

  return {
    percentage: mastery,
    mastered: computed,
    inProgress: values.filter((entry) => entry.status === "in_progress").length,
    unlocked: values.filter((entry) => entry.status === "unlocked").length,
    blocked: values.filter((entry) => entry.status === "blocked").length,
    notStarted: values.filter((entry) => entry.status === "not_started").length,
    skillStatusMap: statusMap,
  };
}

export const defaultConfidenceBySkill: Record<string, number> = {
  python_basics: 78,
  sql_foundations: 64,
  data_analysis: 42,
  statistics: 30,
  data_visualization: 18,
  tableau_or_powerbi: 12,
  communication: 28,
  ml_foundations: 8,
  feature_engineering: 0,
  model_monitoring: 0,
  portfolio_case_study: 0,
  career_strategy: 0,
};

export function getSuggestedNextSkills(skills: Skill[], confidenceBySkill: Record<string, number>) {
  const statusMap = getSkillStatusMap(skills, confidenceBySkill);
  return skills
    .filter((skill) => statusMap[skill.skill_id]?.status === "unlocked" || statusMap[skill.skill_id]?.status === "not_started")
    .sort((a, b) => (confidenceBySkill[a.skill_id] ?? 0) - (confidenceBySkill[b.skill_id] ?? 0))
    .slice(0, 3);
}
