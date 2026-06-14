# Ragebait

> Win the roast. Claim the Aura.

An AI-powered competitive social platform for roast battles, debates, meme
wars, and community challenges. This repo contains the **frontend starter** —
a Next.js + TypeScript + Tailwind scaffold matching the Ragebait design spec
(dark futuristic theme, Aura reputation system, battles, leaderboards, rage
groups, profiles).

## What's included

- Landing page (hero, live battles, features, leaderboard preview, topics, CTA)
- `/battles` — battle listings (casual, ranked, tournament, group, event)
- `/leaderboard` — global rankings by Aura
- `/profile` — user profile, stats, achievements, Aura history
- `/groups` — Rage Groups (communities)
- `/login`, `/signup` — auth UI (forms only, no backend yet)
- Shared UI kit: `Button`, `Card`, `AuraBadge`
- Mock data layer (`src/lib/mockData.ts`) standing in for the real API/DB
- Dark, neon-purple / electric-blue / crimson theme via Tailwind tokens

## Not included yet (per the spec's roadmap)

Auth backend (JWT/bcrypt, OTP email verification), PostgreSQL schema, Redis
caching, Socket.IO real-time chat, AI Judge + AI Moderation integrations
(OpenAI), Cloudinary uploads, tournaments, admin dashboard, analytics. These
are designed as independent modules to be added incrementally — see
`src/types/index.ts` for the data shapes already modeled.

## Getting started locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### Option A — via GitHub (recommended)

1. Push this folder to a new GitHub repository.
2. In Vercel, click **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected). No env vars are required
   for this starter — it runs entirely on mock data.
4. Click **Deploy**.

### Option B — via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel        # preview deploy
vercel --prod # production deploy
```

## Environment variables

Copy `.env.example` to `.env.local` when you start wiring up the real
backend (database, Redis, OpenAI, Cloudinary, email/OTP). None are required
to deploy the current static/mock version.

## Project structure

```
src/
  app/            # Next.js App Router pages
    battles/
    groups/
    leaderboard/
    login/
    profile/
    signup/
    layout.tsx
    page.tsx
    globals.css
  components/
    layout/       # Navbar, Footer
    ui/           # Button, Card, AuraBadge
  lib/
    mockData.ts   # Placeholder data for all features
  types/
    index.ts      # Shared TypeScript interfaces (User, Battle, AI scores, etc.)
```

## Next modules to build (suggested order)

1. Auth (signup/login/OTP) + PostgreSQL + JWT
2. Real-time chat (Socket.IO) + private/group messaging
3. AI Judge + AI Moderation (OpenAI Moderation API + custom scoring prompt)
4. Aura economy persistence + Aura history
5. Tournaments + seasons
6. Admin dashboard + analytics
