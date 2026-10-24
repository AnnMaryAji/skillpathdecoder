import Link from "next/link";

import { GoalRoadmapBuilder } from "@/components/goal-roadmap-builder";

const capabilities = [
  {
    icon: "✳",
    title: "Built around your goal",
    description: "Generate a role-specific roadmap for a career you choose, not just a preset example.",
  },
  {
    icon: "⌘",
    title: "A clear learning sequence",
    description: "See foundations, prerequisites, parallel skills, and the next practical step.",
  },
  {
    icon: "↗",
    title: "Progress that feels tangible",
    description: "Complete AI-generated skill quizzes to score progress on your dashboard.",
  },
];

export default function Home() {
  return (
    <main className="landing">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="SkillPath Decoder home">
          <span className="brand-mark">◇</span>
          <span>skillpath<span className="brand-accent">decoder</span></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/account">Log in / Sign up</Link>
          <Link href="/events">Events</Link>
        </nav>
        <a className="nav-cta" href="#build">Build my path <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Career growth, decoded</p>
          <h1>Turn your ambition into a <span>skill-by-skill plan.</span></h1>
          <p className="hero-lede">
            Pick a role you care about. Discover what it takes, where to start, and how to build evidence of your skills.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#build">Build my roadmap <span aria-hidden="true">↗</span></a>
            <a className="secondary-action" href="#how-it-works">See how it works</a>
          </div>
          <div className="hero-proof">
            <span><strong>Any</strong> career goal</span>
            <span><strong>Clear</strong> prerequisites</span>
            <span><strong>Your</strong> pace</span>
          </div>
        </div>
        <div className="hero-art" aria-label="A preview of a connected skill roadmap">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="roadmap-card">
            <div className="roadmap-card-heading">
              <span className="mini-label">YOUR NEXT MOVE</span>
              <span className="status-chip"><span /> In progress</span>
            </div>
            <h2>Machine Learning Engineer</h2>
            <div className="roadmap-track">
              <div className="track-item completed"><span>✓</span><div><strong>Python foundations</strong><small>Core concepts · 12h</small></div></div>
              <div className="track-connector" />
              <div className="track-item active"><span>02</span><div><strong>Modeling & evaluation</strong><small>Next up · 18h</small></div></div>
              <div className="track-connector" />
              <div className="track-item future"><span>03</span><div><strong>Ship a portfolio project</strong><small>Put it into practice</small></div></div>
            </div>
            <div className="card-progress"><span>Roadmap progress</span><strong>42%</strong><div><i /></div></div>
          </div>
          <div className="floating-note note-top"><span>✳</span> Skills mapped to your goal</div>
          <div className="floating-note note-bottom"><span>↗</span> Your path, not a preset</div>
        </div>
      </section>

      <GoalRoadmapBuilder />

      <section className="capabilities-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">A better way forward</p>
          <h2>From “where do I start?” to “what’s next?”</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map((capability) => (
            <article className="capability-card" key={capability.title}>
              <span className="capability-icon">{capability.icon}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <Link href="/" className="brand"><span className="brand-mark">◇</span><span>skillpath<span className="brand-accent">decoder</span></span></Link>
        <p>Small, deliberate steps make big career moves possible.</p>
        <Link href="/dashboard">Go to your dashboard →</Link>
      </footer>
    </main>
  );
}
