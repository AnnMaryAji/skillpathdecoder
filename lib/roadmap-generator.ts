import { z } from "zod";

import {
  validateDAG,
  type Roadmap,
  type Skill,
} from "./roadmap";

const categories = ["Technical", "Conceptual", "Practical/Portfolio"] as const;

export const generatedSkillSchema = z.object({
  skill_id: z.string().min(1).max(80),
  skill_name: z.string().min(2).max(100),
  category: z.enum(categories),
  description: z.string().min(8).max(500),
  prerequisites: z.array(z.string().min(1).max(80)).max(12),
  estimated_hours: z.number().int().min(1).max(500),
  parallel_group_id: z.union([
    z.string().min(1).max(80),
    z.number().int().nonnegative(),
  ]).transform(String),
  topics: z.array(z.string().min(1).max(100)).min(1).max(8).optional(),
});

export const generatedSkillsSchema = z.array(generatedSkillSchema).min(5).max(24);
const generatedRoadmapResponseSchema = z.object({
  skills: generatedSkillsSchema,
});

export type RoadmapLevel = Roadmap["target_level"];

type SkillOutline = Skill;

function outline(
  name: string,
  category: Skill["category"],
  description: string,
  estimatedHours: number,
  prerequisites: number[] = [],
  parallelGroupId = "core",
  topics: string[] = [],
): SkillOutline {
  return {
    skill_id: "",
    skill_name: name,
    category,
    description,
    estimated_hours: estimatedHours,
    prerequisites: prerequisites.map((index) => `skill-${index + 1}`),
    parallel_group_id: parallelGroupId,
    topics,
  };
}

function createRoleOutline(careerGoal: string): SkillOutline[] {
  const normalized = careerGoal.toLowerCase();
  const roleWord = careerGoal.trim();
  const id = (index: number) => `skill-${index + 1}`;

  const base: SkillOutline[] = [
    outline("Role fundamentals and core concepts", "Conceptual", `Build a clear foundation in the core concepts and day-to-day responsibilities of a ${roleWord}.`, 8, [], "foundation", ["Role overview & responsibilities", "Industry context", "Key terminology", "Career pathways"]),
    outline("Tools and professional workflow", "Technical", `Learn the common tools, workflows, and quality standards used by ${roleWord}s.`, 12, [0], "tooling", ["Core toolset setup", "Version control basics", "Professional workflow", "Quality standards"]),
    outline("Research and problem framing", "Conceptual", `Translate an ambiguous ${roleWord} challenge into a focused question, plan, and measurable outcome.`, 8, [0], "practice", ["Problem definition", "Research planning", "Framing hypotheses", "Measuring outcomes"]),
    outline(`${roleWord} methods and applied techniques`, "Technical", `Practice the methods and techniques most often used to deliver effective ${roleWord} work.`, 16, [1, 2], "practice", ["Core methodology", "Applied techniques", "Iteration & feedback", "Common pitfalls"]),
    outline("Quality, ethics, and risk awareness", "Conceptual", `Apply suitable quality checks, ethical judgment, and risk controls to ${roleWord} decisions.`, 8, [0], "professional", ["Quality frameworks", "Ethical considerations", "Risk identification", "Mitigation strategies"]),
    outline("Communication and collaboration", "Conceptual", `Explain decisions and collaborate with teammates and stakeholders in a ${roleWord} context.`, 8, [2], "professional", ["Written communication", "Presenting findings", "Stakeholder management", "Team collaboration"]),
    outline("End-to-end practical project", "Practical/Portfolio", `Complete a realistic project that demonstrates the core responsibilities of a ${roleWord}.`, 20, [3, 4, 5], "portfolio", ["Project scoping", "Execution & iteration", "Documentation", "Showcasing outcomes"]),
    outline("Portfolio, feedback, and career readiness", "Practical/Portfolio", `Present your ${roleWord} work, incorporate feedback, and prepare for role-relevant opportunities.`, 10, [6], "career", ["Portfolio presentation", "Incorporating feedback", "Resume & LinkedIn", "Interview preparation"]),
  ];

  if (/(data|analytics|machine learning|\bml\b|artificial intelligence|\bai\b)/.test(normalized)) {
    base[1] = outline("Data tooling and computational foundations", "Technical", "Work confidently with the data tools, programming environment, and query techniques used in this role.", 14, [0], "tooling", ["Python / R basics", "SQL & databases", "Jupyter / notebooks", "Data wrangling"]);
    base[3] = outline("Analysis, modeling, and interpretation", "Technical", "Apply suitable analytical or modeling methods and interpret results in the context of the problem.", 18, [1, 2], "practice", ["Exploratory data analysis", "Statistical modeling", "ML algorithms", "Model evaluation"]);
    base[4] = outline("Data quality, privacy, and responsible practice", "Conceptual", "Validate data quality and communicate limitations, privacy considerations, and responsible use.", 10, [1, 3], "professional", ["Data cleaning & validation", "Privacy & compliance", "Bias & fairness", "Communicating limitations"]);
    base[6] = outline("End-to-end data project", "Practical/Portfolio", "Complete a reproducible project that turns a real question into a defensible, clearly communicated result.", 20, [3, 4, 5], "portfolio", ["Problem framing", "Data pipeline", "Analysis & modeling", "Reporting & storytelling"]);
  } else if (/(cyber|security|infosec|penetration|soc analyst)/.test(normalized)) {
    base[1] = outline("Networks, systems, and security tooling", "Technical", "Understand key network and operating-system concepts and work with standard defensive tooling.", 16, [0], "tooling", ["TCP/IP & networking", "OS fundamentals", "SIEM & log analysis", "Defensive tools"]);
    base[3] = outline("Threat analysis and defensive controls", "Technical", "Assess threats and apply appropriate defensive controls, monitoring, and incident workflows.", 18, [1, 2], "practice", ["Threat modelling", "Vulnerability assessment", "Incident response", "Security monitoring"]);
    base[4] = outline("Security governance and responsible practice", "Conceptual", "Apply authorization, privacy, risk management, and responsible disclosure principles.", 10, [0, 3], "professional", ["Risk frameworks", "Compliance & regulations", "Responsible disclosure", "Security policies"]);
    base[6] = outline("Documented defensive security exercise", "Practical/Portfolio", "Complete a safe, authorized defensive exercise and document findings, mitigations, and lessons.", 18, [3, 4, 5], "portfolio", ["Lab environment setup", "Exercise execution", "Findings documentation", "Remediation planning"]);
  } else if (/(policy|public affairs|government)/.test(normalized)) {
    base[1] = outline("Policy frameworks and research methods", "Technical", "Learn the research methods, institutions, and policy frameworks used in this field.", 14, [0], "tooling", ["Policy cycle", "Legislative frameworks", "Research methods", "Institutional analysis"]);
    base[2] = outline("Evidence appraisal and stakeholder analysis", "Conceptual", "Assess evidence quality and map the people and communities affected by policy decisions.", 12, [0], "research", ["Evidence evaluation", "Stakeholder mapping", "Impact assessment", "Equity considerations"]);
    base[3] = outline("Policy analysis and impact assessment", "Technical", "Compare policy options and assess their likely effects, feasibility, and trade-offs.", 18, [1, 2], "practice", ["Options analysis", "Cost-benefit analysis", "Feasibility assessment", "Trade-off evaluation"]);
    base[4] = outline("Regulation, ethics, and implementation risks", "Conceptual", "Account for legal context, equity, uncertainty, and practical implementation constraints.", 10, [0, 3], "professional", ["Legal & regulatory context", "Ethical frameworks", "Uncertainty management", "Implementation planning"]);
    base[6] = outline("Write and present a policy recommendation", "Practical/Portfolio", "Create a concise, evidence-based recommendation with clear assumptions, impacts, and implementation steps.", 18, [3, 4, 5], "portfolio", ["Executive summary writing", "Evidence synthesis", "Recommendation structure", "Oral presentation"]);
  } else if (/(design|ux|ui|product manager|product owner|product management)/.test(normalized)) {
    base[1] = outline("Design and prototyping toolkit", "Technical", "Use common design and prototyping tools to turn early ideas into testable concepts.", 12, [0], "tooling", ["Figma / design tools", "Wireframing", "Prototyping", "Design systems"]);
    base[2] = outline("User research and opportunity discovery", "Conceptual", "Plan user research, synthesize findings, and identify evidence-backed opportunities.", 12, [0], "research", ["Research planning", "Interviews & usability tests", "Affinity mapping", "Insight synthesis"]);
    base[3] = outline("Interaction design and validation", "Technical", "Create and validate accessible experiences or product solutions against user needs and constraints.", 18, [1, 2], "practice", ["Information architecture", "Interaction patterns", "Accessibility", "Usability testing"]);
    base[6] = outline("Research-to-release portfolio project", "Practical/Portfolio", "Document a complete project from discovery through iteration, with rationale and measurable outcomes.", 20, [3, 4, 5], "portfolio", ["Discovery documentation", "Design decisions", "Iteration evidence", "Case study presentation"]);
  } else if (/(marketing|content|seo|social media|growth|sales|brand)/.test(normalized)) {
    base[1] = outline("Marketing platforms and channel fundamentals", "Technical", "Learn the platforms, channel conventions, and operational workflows relevant to this role.", 12, [0], "tooling", ["Platform walkthroughs", "Channel strategy", "Content calendars", "Analytics tools"]);
    base[3] = outline("Audience strategy and campaign execution", "Technical", "Develop audience-focused messaging and execute a coordinated campaign using appropriate channels.", 16, [1, 2], "practice", ["Audience segmentation", "Messaging frameworks", "Campaign planning", "Execution & optimisation"]);
    base[4] = outline("Measurement, experimentation, and compliance", "Conceptual", "Measure campaign performance, run useful experiments, and follow applicable privacy and brand standards.", 10, [1, 3], "professional", ["KPIs & metrics", "A/B testing", "Privacy regulations", "Brand guidelines"]);
    base[6] = outline("Plan and evaluate a full campaign", "Practical/Portfolio", "Create a practical campaign plan, launch or simulate it, and present evidence-based results.", 18, [3, 4, 5], "portfolio", ["Campaign brief", "Channel execution", "Performance analysis", "Retrospective & learnings"]);
  } else if (/(software|web|full.?stack|front.?end|back.?end|developer|programmer|mobile|devops|cloud engineer|platform engineer)/.test(normalized)) {
    base[1] = outline("Programming foundations and developer tools", "Technical", "Build fluency with a suitable programming language, version control, and a dependable development workflow.", 16, [0], "tooling", ["Language fundamentals", "Version control (Git)", "Package management", "Dev environment setup"]);
    base[3] = outline("Software design, APIs, and implementation", "Technical", "Design, implement, and integrate maintainable software features that meet user and system requirements.", 20, [1, 2], "engineering", ["System design principles", "REST & API design", "Database integration", "Clean code practices"]);
    base[4] = outline("Testing, security, and reliability", "Conceptual", "Use testing, secure coding practices, and reliability checks to deliver dependable software.", 12, [1, 3], "engineering", ["Unit & integration testing", "Secure coding", "Observability & logging", "Performance basics"]);
    base[6] = outline("Build and deploy a production-style application", "Practical/Portfolio", "Ship a complete application with documented decisions, tests, and a repeatable deployment workflow.", 24, [3, 4, 5], "portfolio", ["App architecture", "CI/CD pipeline", "Deployment & hosting", "Documentation & README"]);
  }

  return base.map((skill, index) => ({
    ...skill,
    skill_id: id(index),
  }));
}

function normalizeSkills(skills: z.infer<typeof generatedSkillsSchema>): Skill[] {
  const idByOriginal = new Map<string, string>();
  const normalized = skills.map((skill, index) => {
    const baseId = skill.skill_id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || `skill_${index + 1}`;
    if ([...idByOriginal.values()].includes(baseId)) {
      throw new Error(`Generated roadmap has duplicate skill ID "${skill.skill_id}".`);
    }
    idByOriginal.set(skill.skill_id, baseId);
    return { ...skill, skill_id: baseId };
  });

  return normalized.map((skill) => ({
    ...skill,
    prerequisites: [...new Set(skill.prerequisites.map((prerequisite) => (
      idByOriginal.get(prerequisite) ?? prerequisite
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 64)
    )))],
  }));
}

export function createRoleBasedRoadmap(
  careerGoal: string,
  targetLevel: RoadmapLevel = "Mid",
): Roadmap {
  const outlineSkills = createRoleOutline(careerGoal);
  const skills = normalizeSkills(generatedSkillsSchema.parse(outlineSkills));

  return {
    career_goal: careerGoal.trim(),
    target_level: targetLevel,
    skills,
  };
}

export function parseGeneratedRoadmap(
  careerGoal: string,
  targetLevel: RoadmapLevel,
  value: unknown,
): Roadmap {
  const { skills: rawSkills } = generatedRoadmapResponseSchema.parse(value);
  const skills = normalizeSkills(rawSkills);
  const validation = validateDAG(skills);
  if (!validation.valid) {
    throw new Error(`Generated roadmap has invalid prerequisites: ${validation.issues.join(" ")}`);
  }

  return { career_goal: careerGoal, target_level: targetLevel, skills };
}
