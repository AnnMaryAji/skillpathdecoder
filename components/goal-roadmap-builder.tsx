"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { savedRoadmapSchema, saveRoadmapToStorage } from "@/lib/roadmap-storage";

const suggestedGoals = [
  "Machine Learning Engineer",
  "Full Stack Developer",
  "UX Designer",
  "Cybersecurity Analyst",
];

export function GoalRoadmapBuilder() {
  const [careerGoal, setCareerGoal] = useState("");
  const [targetLevel, setTargetLevel] = useState<"Entry" | "Mid" | "Senior">("Entry");
  const [roadmap, setRoadmap] = useState<ReturnType<typeof savedRoadmapSchema.parse> | null>(null);
  const [source, setSource] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateRoadmap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/roadmaps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerGoal, targetLevel }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : "Roadmap generation failed. Please try again.";
        throw new Error(message);
      }

      if (typeof payload !== "object" || payload === null || !("roadmap" in payload)) {
        throw new Error("The roadmap service returned an unexpected response.");
      }

      const result = savedRoadmapSchema.safeParse(payload.roadmap);
      if (!result.success) {
        throw new Error("The roadmap service returned invalid skill data.");
      }

      saveRoadmapToStorage(result.data);
      setRoadmap(result.data);
      setSource("source" in payload ? String(payload.source) : "Generated");
      const accountResponse = await fetch("/api/account/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap: result.data }),
      });
      let accountRoadmapSaved = false;
      if (accountResponse.status !== 401) {
        if (!accountResponse.ok) {
          const accountPayload: unknown = await accountResponse.json();
          const accountError = typeof accountPayload === "object" && accountPayload !== null && "error" in accountPayload
            ? String(accountPayload.error)
            : "Your account could not save the roadmap.";
          throw new Error(accountError);
        }
        accountRoadmapSaved = true;
      }

      setNotice(accountRoadmapSaved
        ? "Your roadmap is saved to your account."
        : "Your roadmap is ready in this browser. Sign in to save it with your quiz progress.");
      if ("notice" in payload && typeof payload.notice === "string") {
        setNotice(`${accountRoadmapSaved ? "Your roadmap is saved." : "Your roadmap is ready."} ${payload.notice}`);
      }
    } catch (generationError) {
      setNotice("");
      setError(generationError instanceof Error ? generationError.message : "Roadmap generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section id="build" className="builder-shell">
      <div className="builder-intro">
        <p className="eyebrow">Your next chapter starts here</p>
        <h2>What do you want to become?</h2>
        <p>Choose any role. Get the skills, sequence, and realistic time commitment to move forward.</p>
        <div className="suggestion-list" aria-label="Popular career goals">
          {suggestedGoals.map((goal) => (
            <button key={goal} type="button" onClick={() => setCareerGoal(goal)}>
              {goal}
            </button>
          ))}
        </div>
      </div>

      <form className="goal-form" onSubmit={generateRoadmap}>
        <label htmlFor="career-goal">Career goal</label>
        <input
          id="career-goal"
          value={careerGoal}
          onChange={(event) => setCareerGoal(event.target.value)}
          placeholder="e.g. Climate Policy Analyst"
          minLength={2}
          maxLength={120}
          required
        />
        <div className="goal-form-row">
          <label htmlFor="target-level">Target level</label>
          <select
            id="target-level"
            value={targetLevel}
            onChange={(event) => {
              const value = event.target.value;
              setTargetLevel(value === "Mid" || value === "Senior" ? value : "Entry");
            }}
          >
            <option value="Entry">Starting out</option>
            <option value="Mid">Building experience</option>
            <option value="Senior">Advanced</option>
          </select>
        </div>
        <button className="primary-action" type="submit" disabled={isGenerating}>
          {isGenerating ? "Building your roadmap..." : "Generate my roadmap"}
          {!isGenerating && <span aria-hidden="true">↗</span>}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>

      <div className="builder-result" aria-live="polite">
        {roadmap ? (
          <>
            <div className="result-heading">
              <div>
                <p className="eyebrow">{source} roadmap · {roadmap.target_level}</p>
                <h3>{roadmap.career_goal}</h3>
              </div>
              <Link href="/dashboard" className="text-action">Open dashboard →</Link>
            </div>
            <ol className="skill-preview">
              {roadmap.skills.map((skill, index) => (
                <li key={skill.skill_id}>
                  <span className="skill-step">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{skill.skill_name}</strong>
                    <p>{skill.estimated_hours} hours · {skill.category}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="empty-roadmap">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <p className="eyebrow">A plan that starts with you</p>
            <h3>Your skills will appear here</h3>
            <p>Enter a role above. We’ll map foundations, role-specific skills, and a hands-on portfolio project.</p>
          </div>
        )}
      </div>
    </section>
  );
}
