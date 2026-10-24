"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RoadmapGraph } from "@/components/roadmap-graph";
import { curatedEvents, filterAndRankEvents } from "@/lib/events";
import {
  calculateProgress,
  getSkillStatusMap,
  getSuggestedNextSkills,
  type Roadmap,
} from "@/lib/roadmap";
import { readRoadmapFromStorage, savedRoadmapSchema } from "@/lib/roadmap-storage";

type AccountState = {
  id: string;
  name: string | null;
  email: string;
  roadmap: Roadmap | null;
  skillProgress: Record<string, number>;
  roadmapReview: {
    checkedAt: string;
    summary: string;
    sources: { title: string; url: string }[];
  } | null;
};

type QuizQuestion = {
  prompt: string;
  options: string[];
};

type ActiveQuiz = {
  attemptId: string;
  skillId: string;
  skillName: string;
  questions: QuizQuestion[];
};

type QuizResult = {
  correct: number;
  total: number;
  percentage: number;
  skillProgress: number;
  explanations: string[];
};

const EMPTY_PROGRESS: Record<string, number> = {};

function isProgressRecord(value: unknown): value is Record<string, number> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.values(value).every((score) => typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 100);
}

function isRoadmapReview(value: unknown): value is NonNullable<AccountState["roadmapReview"]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (!("checkedAt" in value) || typeof value.checkedAt !== "string") return false;
  if (!("summary" in value) || typeof value.summary !== "string") return false;
  if (!("sources" in value) || !Array.isArray(value.sources)) return false;
  return value.sources.every((source) => {
    if (typeof source !== "object" || source === null || Array.isArray(source)) return false;
    if (!("title" in source) || typeof source.title !== "string") return false;
    if (!("url" in source) || typeof source.url !== "string") return false;
    try {
      return new URL(source.url).protocol === "https:";
    } catch {
      return false;
    }
  });
}

async function getErrorMessage(response: Response, fallback: string) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown content type";
    return `${fallback} The API returned a non-JSON response (HTTP ${response.status}, ${contentType}). Make sure the SkillPath app is running from the skillpathdecoder project folder.`;
  }
  return typeof payload === "object" && payload !== null && "error" in payload
    ? String(payload.error)
    : fallback;
}

export function DashboardClient({
  eventId,
  eventSkill,
  eventRequest,
}: {
  eventId?: string;
  eventSkill?: string;
  eventRequest?: string;
}) {
  const router = useRouter();
  const quizIntentHandled = useRef<string | null>(null);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [localRoadmap, setLocalRoadmap] = useState<Roadmap | null>(null);
  const [accountStatus, setAccountStatus] = useState<"loading" | "anonymous" | "authenticated">("loading");
  const [message, setMessage] = useState("");
  const [loadingSkill, setLoadingSkill] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizError, setQuizError] = useState("");
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const response = await fetch("/api/account/me", { cache: "no-store" });
        if (response.status === 401) {
          try {
            const browserRoadmap = readRoadmapFromStorage();
            if (!cancelled) setLocalRoadmap(browserRoadmap);
          } catch (error) {
            if (!cancelled) {
              setMessage(error instanceof Error ? error.message : "Your browser roadmap could not be loaded.");
            }
          }
          if (!cancelled) setAccountStatus("anonymous");
          return;
        }
        if (!response.ok) throw new Error(await getErrorMessage(response, "Your account could not be loaded."));

        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null || !("user" in payload) || !("skillProgress" in payload)) {
          throw new Error("Your account service returned an invalid response.");
        }

        const user = payload.user;
        const parsedRoadmap = "roadmap" in payload && payload.roadmap !== null
          ? savedRoadmapSchema.safeParse(payload.roadmap)
          : null;
        if (parsedRoadmap && !parsedRoadmap.success) throw new Error("Your saved roadmap is invalid.");
        if (
          typeof user !== "object" || user === null
          || !("id" in user) || typeof user.id !== "string"
          || !("email" in user) || typeof user.email !== "string"
          || !("name" in user) || (typeof user.name !== "string" && user.name !== null)
          || !isProgressRecord(payload.skillProgress)
          || !("roadmapReview" in payload)
          || (payload.roadmapReview !== null && !isRoadmapReview(payload.roadmapReview))
        ) {
          throw new Error("Your account service returned invalid account data.");
        }

        const roadmap = parsedRoadmap?.success ? parsedRoadmap.data : null;

        if (!cancelled) {
          setAccount({
            id: user.id,
            name: user.name,
            email: user.email,
            roadmap,
            skillProgress: payload.skillProgress,
            roadmapReview: payload.roadmapReview === null ? null : payload.roadmapReview,
          });
          setAccountStatus("authenticated");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Your account could not be loaded.");
          setAccountStatus("anonymous");
        }
      }
    }

    void loadAccount();
    return () => { cancelled = true; };
  }, []);

  const roadmap = accountStatus === "authenticated" ? account?.roadmap ?? null : localRoadmap;
  const confidence = accountStatus === "authenticated" ? account?.skillProgress ?? EMPTY_PROGRESS : EMPTY_PROGRESS;
  const progress = useMemo(
    () => roadmap ? calculateProgress(roadmap.skills, confidence) : null,
    [roadmap, confidence],
  );
  const statuses = useMemo(
    () => roadmap ? getSkillStatusMap(roadmap.skills, confidence) : {},
    [roadmap, confidence],
  );
  const nextSkills = useMemo(
    () => roadmap ? getSuggestedNextSkills(roadmap.skills, confidence) : [],
    [roadmap, confidence],
  );
  const eventMatches = useMemo(
    () => roadmap
      ? filterAndRankEvents(
        curatedEvents,
        { radiusKm: 50, categories: [], online: true, inPerson: false, minRelevance: 30, timezone: "UTC" },
        roadmap.skills.map((skill) => skill.skill_id),
        roadmap.career_goal,
      )
      : [],
    [roadmap],
  );
  const eventsHref = roadmap
    ? `/events?${new URLSearchParams({
      careerGoal: roadmap.career_goal,
      skills: roadmap.skills.map((skill) => skill.skill_id).join(","),
    }).toString()}`
    : "/events";

  const startQuiz = useCallback(async (skillId: string, eventId?: string, returnTo?: string) => {
    if (accountStatus !== "authenticated") {
      const destination = returnTo ?? window.location.pathname + window.location.search;
      router.push(`/account?returnTo=${encodeURIComponent(destination)}`);
      return;
    }

    setLoadingSkill(skillId);
    setQuizError("");
    setQuizResult(null);
    setActiveQuiz(null);
    setAnswers([]);

    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, eventId }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Quiz generation failed."));
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" || payload === null
        || !("attemptId" in payload) || typeof payload.attemptId !== "string"
        || !("skillId" in payload) || typeof payload.skillId !== "string"
        || !("skillName" in payload) || typeof payload.skillName !== "string"
        || !("questions" in payload) || !Array.isArray(payload.questions)
      ) {
        throw new Error("The quiz service returned an invalid quiz.");
      }

      const questions: QuizQuestion[] = payload.questions.map((question) => {
        if (
          typeof question !== "object" || question === null
          || !("prompt" in question) || typeof question.prompt !== "string"
          || !("options" in question) || !Array.isArray(question.options)
          || question.options.length !== 4
          || !question.options.every((option: unknown): option is string => typeof option === "string")
        ) {
          throw new Error("The quiz service returned an invalid question.");
        }
        return { prompt: question.prompt, options: question.options };
      });
      if (questions.length !== 5) throw new Error("The quiz service returned an incomplete quiz.");

      setActiveQuiz({
        attemptId: payload.attemptId,
        skillId: payload.skillId,
        skillName: payload.skillName,
        questions,
      });
      if (eventId) window.history.replaceState(null, "", "/dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Quiz generation failed.");
    } finally {
      setLoadingSkill("");
    }
  }, [accountStatus, router]);

  useEffect(() => {
    if (accountStatus === "loading" || !eventId || !eventSkill) return;
    const intent = `${eventId}:${eventSkill}:${eventRequest ?? ""}`;
    if (quizIntentHandled.current === intent) return;

    const returnTo = window.location.pathname + window.location.search;
    if (accountStatus === "anonymous") {
      router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (accountStatus !== "authenticated") return;

    quizIntentHandled.current = intent;
    const timer = window.setTimeout(() => {
      void startQuiz(eventSkill, eventId, returnTo);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accountStatus, eventId, eventRequest, eventSkill, router, startQuiz]);

  async function submitQuiz() {
    if (
      !activeQuiz
      || answers.length !== activeQuiz.questions.length
      || answers.filter((answer) => answer !== undefined).length !== activeQuiz.questions.length
    ) return;
    setSubmittingQuiz(true);
    setQuizError("");

    try {
      const response = await fetch(`/api/quizzes/${encodeURIComponent(activeQuiz.attemptId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Your quiz could not be graded."));
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" || payload === null
        || !("correct" in payload) || typeof payload.correct !== "number"
        || !("total" in payload) || typeof payload.total !== "number"
        || !("percentage" in payload) || typeof payload.percentage !== "number"
        || !("skillProgress" in payload) || typeof payload.skillProgress !== "number"
        || !("explanations" in payload) || !Array.isArray(payload.explanations)
      ) {
        throw new Error("The quiz service returned an invalid result.");
      }
      const savedProgress: unknown = payload.skillProgress;
      if (typeof savedProgress !== "number") throw new Error("The quiz service returned invalid progress.");

      setQuizResult({
        correct: payload.correct,
        total: payload.total,
        percentage: payload.percentage,
        skillProgress: savedProgress,
        explanations: payload.explanations.filter((item): item is string => typeof item === "string"),
      });
      setAccount((current) => current
        ? {
          ...current,
          skillProgress: {
            ...current.skillProgress,
            [activeQuiz.skillId]: savedProgress,
          },
        }
        : current);
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Your quiz could not be graded.");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function signOut() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      setMessage("Sign out failed. Please try again.");
      return;
    }
    setAccount(null);
    setAccountStatus("anonymous");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8">
      <header className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-violet-100/10 pb-5">
        <div>
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">SkillPath Decoder</Link>
          <h1 className="mt-2 text-3xl font-bold text-white">Your career dashboard</h1>
          {account && <p className="mt-1 text-sm text-slate-400">Signed in as {account.name || account.email}</p>}
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300">
          <Link href="/">Home</Link>
          <Link href={eventsHref}>Events</Link>
          <Link href="/notifications">Notifications</Link>
          {accountStatus === "authenticated"
            ? <button type="button" onClick={signOut} className="text-teal-200 hover:text-teal-100">Log out</button>
            : <Link href="/account" className="text-teal-200 hover:text-teal-100">Log in / Sign up</Link>}
        </nav>
      </header>

      {(message || quizError) && (
        <div role="alert" className="mb-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
          {quizError || message}
        </div>
      )}

      {accountStatus === "loading" ? (
        <p className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">Loading your saved progress…</p>
      ) : !roadmap || !progress ? (
        <section className="rounded-3xl border border-violet-100/15 bg-violet-950/30 p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">No roadmap yet</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold text-white">Start with a career goal that matters to you.</h2>
          <p className="mt-3 max-w-xl leading-7 text-slate-300">Generate a personalized set of skills for any role. Your new path will appear here automatically.</p>
          <Link href="/#build" className="mt-7 inline-flex rounded-full bg-violet-500 px-5 py-3 font-semibold text-white hover:bg-violet-400">
            Create my roadmap <span className="ml-2">↗</span>
          </Link>
          {accountStatus === "anonymous" && (
            <p className="mt-5 text-sm text-slate-300">Already have a roadmap? <Link href="/account" className="font-semibold text-teal-200">Sign in to save progress.</Link></p>
          )}
        </section>
      ) : (
        <>
          {accountStatus === "anonymous" && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200/20 bg-teal-200/5 p-4 text-sm text-slate-200">
              <span>Sign in to take skill quizzes and save your scores across devices.</span>
              <Link href="/account" className="font-semibold text-teal-200">Log in / Sign up →</Link>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Overall quiz progress" value={`${progress.percentage}%`} />
            <StatCard label="Skills mastered" value={String(progress.mastered)} />
            <StatCard label="In progress" value={String(progress.inProgress)} />
            <StatCard label="Total learning time" value={`${roadmap.skills.reduce((sum, skill) => sum + skill.estimated_hours, 0)}h`} />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Your current goal</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{roadmap.career_goal}</h2>
                </div>
                <span className="rounded-full border border-violet-200/15 bg-violet-400/10 px-3 py-1 text-sm font-semibold text-violet-100">{roadmap.target_level}</span>
              </div>
              {account?.roadmapReview && (
                <div className="mb-4 rounded-2xl border border-teal-200/15 bg-teal-200/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-200">
                    Path review · {new Date(account.roadmapReview.checkedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">{account.roadmapReview.summary}</p>
                  {account.roadmapReview.sources.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {account.roadmapReview.sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noreferrer" className="text-xs text-teal-200 underline decoration-teal-200/40 underline-offset-2">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <RoadmapGraph skills={roadmap.skills} statuses={statuses} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Quiz scores update your progress. A skill unlocks its dependents at 80%.</p>
                <Link href="/#build" className="text-sm font-semibold text-teal-200 hover:text-teal-100">Change career goal →</Link>
              </div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">Start here</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Recommended next skills</h2>
                  </div>
                  <span className="text-xl text-teal-200">✳</span>
                </div>
                {nextSkills.length ? (
                  <ul className="space-y-2">
                    {nextSkills.map((skill) => (
                      <li key={skill.skill_id} className="rounded-xl border border-white/5 bg-white/[0.035] p-3">
                        <strong className="block text-sm text-slate-100">{skill.skill_name}</strong>
                        <span className="mt-1 block text-xs text-slate-400">{skill.estimated_hours} hours · {skill.category}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-400">You’ve mastered every skill in this roadmap. Nice work.</p>}
              </section>

              <section className="rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">Matched to your goal</p>
                <h2 className="mt-1 text-lg font-bold text-white">Online events</h2>
                {eventMatches.length ? (
                  <ul className="mt-4 space-y-3">
                    {eventMatches.slice(0, 3).map((event) => (
                      <li key={event.id} className="rounded-xl bg-white/[0.035] p-3">
                        <strong className="block text-sm text-slate-100">{event.title}</strong>
                        <span className="mt-1 block text-xs text-slate-400">{event.city} · {event.eventType} · {event.relevanceScore}% match</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 text-sm text-slate-400">No curated events currently match this path.</p>}
                <Link href={eventsHref} className="mt-4 inline-block text-sm font-semibold text-teal-200">Explore nearby events →</Link>
              </section>
            </aside>
          </section>

          <section className="mt-7 rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">Quiz-based progress</p>
              <h2 className="mt-1 text-xl font-bold text-white">Check your skill progress</h2>
              <p className="mt-1 text-sm text-slate-400">Generate an AI quiz for a skill. Progress changes only after the server grades every answer.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {roadmap.skills.map((skill) => {
                const score = confidence[skill.skill_id] ?? 0;
                const courseQuery = encodeURIComponent(`${skill.skill_name} ${roadmap.career_goal} course`);
                const coursesUrl = `https://www.coursera.org/search?query=${courseQuery}`;
                return (
                  <article key={skill.skill_id} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-slate-100">{skill.skill_name}</strong>
                      <span className="text-xs font-semibold text-teal-200">{score}%</span>
                    </div>
                    {skill.topics && skill.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {skill.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-medium text-violet-200"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${skill.skill_name} quiz progress`} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-teal-200" style={{ width: `${score}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{statuses[skill.skill_id]?.status.replace("_", " ")}</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={coursesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-teal-300/20 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-400/10"
                          title={`Find online courses for ${skill.skill_name}`}
                        >
                          Find courses →
                        </a>
                        <button
                          type="button"
                          onClick={() => void startQuiz(skill.skill_id)}
                          disabled={accountStatus !== "authenticated" || loadingSkill === skill.skill_id}
                          className="rounded-full border border-violet-200/20 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loadingSkill === skill.skill_id ? "Generating…" : "Show progress"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

        </>
      )}
      {(activeQuiz || quizResult) && (
        <section className="mt-7 rounded-3xl border border-teal-200/20 bg-[#11132d]/95 p-5 sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-200">OpenAI skill quiz</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{activeQuiz?.skillName ?? "Quiz results"}</h2>
            </div>
            <button
              type="button"
              onClick={() => { setActiveQuiz(null); setQuizResult(null); setQuizError(""); }}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300"
            >
              Close
            </button>
          </div>

          {activeQuiz && !quizResult && (
            <div className="mt-5 space-y-5">
              {activeQuiz.questions.map((question, questionIndex) => (
                <fieldset key={`${activeQuiz.attemptId}-${questionIndex}`} className="rounded-2xl border border-white/10 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-100">{questionIndex + 1}. {question.prompt}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${answers[questionIndex] === optionIndex ? "border-violet-300 bg-violet-400/10 text-white" : "border-white/10 text-slate-300"}`}>
                        <input
                          type="radio"
                          name={`quiz-${activeQuiz.attemptId}-${questionIndex}`}
                          value={optionIndex}
                          checked={answers[questionIndex] === optionIndex}
                          onChange={() => setAnswers((current) => {
                            const next = [...current];
                            next[questionIndex] = optionIndex;
                            return next;
                          })}
                          className="mt-1 accent-violet-400"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{answers.filter((answer) => answer !== undefined).length} of {activeQuiz.questions.length} answered</span>
                <button
                  type="button"
                  onClick={() => void submitQuiz()}
                  disabled={submittingQuiz || answers.length !== activeQuiz.questions.length || answers.filter((answer) => answer !== undefined).length !== activeQuiz.questions.length}
                  className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingQuiz ? "Grading…" : "Submit quiz"}
                </button>
              </div>
            </div>
          )}

          {quizResult && (
            <div className="mt-5">
              <p className="text-lg font-semibold text-white">You scored {quizResult.correct}/{quizResult.total} ({quizResult.percentage}%).</p>
              <p className="mt-1 text-sm text-slate-300">Saved skill progress: {quizResult.skillProgress}%.</p>
              <ol className="mt-5 space-y-3">
                {quizResult.explanations.map((explanation, index) => (
                  <li key={index} className="rounded-xl bg-white/[0.035] p-3 text-sm text-slate-300">
                    <strong className="text-slate-100">Question {index + 1}:</strong> {explanation}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100/15 bg-[#11132d]/90 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
