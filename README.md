# SkillPath Decoder

SkillPath Decoder combines the original SkillPath interactive experience with the Vibethon Next.js backend. Build a roadmap for any career goal, track confidence, and explore career events.

## Features

- AI-generated career roadmaps for user-entered roles (Gemini or OpenAI)
- Role-aware roadmap generation without an API key, with the fallback clearly labeled
- AI-personalized career roadmaps for user-entered roles
- Adaptive career roadmap visualization and prerequisite graph
- AI-generated skill quizzes with server-graded, score-based progress
- Email/password accounts that save roadmaps and quiz progress in PostgreSQL
- Event discovery with a 50 km default radius
- Persistent notification center and reminder scheduling hooks
- Prisma-ready schema for users, roadmaps, events, and notifications

## Quick start with Supabase

1. Create a Supabase project and save its database password.
2. In the Supabase dashboard, open **Connect** and copy the **Transaction pooler** connection string for `DATABASE_URL` (port `6543`). Keep `?pgbouncer=true` at the end.
3. Copy the **Session pooler** connection string for `DIRECT_URL` (port `5432`). Prisma uses this connection for migrations. The pooler works on IPv4 networks where the database's direct host may not.
4. Copy `.env.example` to `.env.local` and replace `<PROJECT_REF>`, `<URL_ENCODED_DB_PASSWORD>`, and `<POOLER_HOST>` in both URLs with the values from Supabase. URL-encode special characters in the password.
5. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). Keep `AI_PROVIDER="gemini"` and add the key as `GEMINI_API_KEY`. The default `GEMINI_MODEL` is `gemini-3.1-flash-lite`; check Google's current [model list](https://ai.google.dev/gemini-api/docs/models) and [pricing and free-tier limits](https://ai.google.dev/gemini-api/docs/pricing) for availability in your region. Gemini's free tier has quotas and eligibility restrictions, and Google may use free-tier API content to improve its products; review the current terms before sending sensitive data.
6. Prisma CLI reads `.env`, not `.env.local`. Copy `.env.local` to `.env` for local development, or put the same `DATABASE_URL` and `DIRECT_URL` values in both files. Keep both files private and never commit them.
7. Install dependencies: `npm install`
8. Apply the database migrations from the project folder: `npx prisma migrate deploy`
9. Start the app: `npm run dev`, then open `http://localhost:3000`.

Use the exact connection strings shown for your project in Supabase's **Connect** dialog; pooler hostnames include your project's region. The app connects directly to Supabase Postgres through Prisma. It does not use Supabase Auth or require the Supabase JavaScript client. Supabase's [Prisma guide](https://supabase.com/docs/guides/database/prisma) explains the connection modes and recommends a dedicated database role for Prisma in production.

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — lint the project
- `npm run test` — run the unit tests

## Project structure

- `app/` — pages and API routes, including `POST /api/roadmaps/generate`
- `components/` — reusable and interactive UI components
- `lib/` — roadmap, event, notification, and persistence logic
- `prisma/` — Prisma schema and migration scaffold
- `public/skillpath/` — legacy static pages redirected to the account-backed dashboard

## Progress and accounts

Progress is not editable from the dashboard. A signed-in user requests an AI-generated quiz for a roadmap skill, submits all answers, and the server grades the stored quiz attempt. The score updates that skill's saved progress; the roadmap progress summary averages the skill scores. Event completion links open the dashboard with a quiz for a skill covered by the event.

Passwords are stored as scrypt hashes. Sessions use random, HTTP-only cookies and are stored in the database. Quiz scores are bound to the exact roadmap skill definition and cannot be reused after that skill changes. The migration intentionally resets older client-editable progress; users need to complete quizzes to establish verified scores. AI generation uses the server-side `AI_PROVIDER`, `GEMINI_API_KEY`, and `GEMINI_MODEL` settings by default. To use OpenAI instead, set `AI_PROVIDER="openai"` and configure `OPENAI_API_KEY` and `OPENAI_MODEL`.

## Event and notification notes

The app includes a curated event catalog fallback so the project can run without external provider credentials, while still exposing server-side endpoints for scheduled sync and notification processing. In-person events are filtered using browser geolocation; if location permission is unavailable, only online events are shown. Production deployments should swap in a provider adapter for a live source and set `EVENT_SYNC_SECRET`.

## Deployment

This starter is designed for Next.js hosting and can be deployed to Vercel or a Node-compatible environment. Set both `DATABASE_URL` (Supavisor transaction pooler) and `DIRECT_URL` (Supavisor session pooler) in the deployment environment, along with the selected AI provider's server-side key and model. Never put real credentials in `.env.example` or source control.
