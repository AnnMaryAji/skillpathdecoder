"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Mode = "signup" | "login";

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        const contentType = response.headers.get("content-type") ?? "unknown content type";
        throw new Error(
          `The account API returned a non-JSON response (HTTP ${response.status}, ${contentType}). Make sure the SkillPath app is running from the skillpathdecoder project folder, then review its server logs.`,
        );
      }
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : `Your account request could not be completed (HTTP ${response.status}).`;
        throw new Error(message);
      }
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const safeReturnTo = returnTo?.startsWith("/dashboard") && !returnTo.startsWith("//")
        ? returnTo
        : "/dashboard";
      const returnParams = new URLSearchParams(safeReturnTo.split("?")[1] ?? "");
      if (returnParams.has("eventId") && returnParams.has("eventSkill")) {
        window.location.assign(safeReturnTo);
        return;
      }
      router.push(safeReturnTo);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Your account request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 py-12">
      <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">SkillPath Decoder</Link>
      <section className="mt-8 rounded-3xl border border-violet-100/15 bg-[#11132d]/90 p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Your learning, saved</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Save your roadmap and quiz-based skill progress across sessions.</p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-white/5 p-1">
          {(["signup", "login"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setMode(option); setError(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${mode === option ? "bg-violet-500 text-white" : "text-slate-300"}`}
            >
              {option === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <label className="block text-sm font-semibold text-slate-200">
              Name
              <input
                autoComplete="name"
                className="mt-2 block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-normal text-white outline-none focus:border-violet-300"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-200">
            Email
            <input
              type="email"
              autoComplete="email"
              className="mt-2 block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-normal text-white outline-none focus:border-violet-300"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Password
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="mt-2 block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 font-normal text-white outline-none focus:border-violet-300"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "signup" ? 10 : 1}
              maxLength={128}
              required
            />
            {mode === "signup" && <span className="mt-1 block text-xs font-normal text-slate-400">Use at least 10 characters.</span>}
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-violet-500 px-5 py-3 font-semibold text-white hover:bg-violet-400 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
