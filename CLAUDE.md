# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

- `GUIDELINES.md` — product and safety rules. **Read before any change**; every decision in the code is subordinate to it (no diagnosis, allergen blocking, calorie floor, wording bans, NPI "never say licensed/verified", etc.).
- `PLAN.md` — architecture, data model, and the numbered sub-tasks (`ST-1`…`ST-n`) that commits and code comments refer to.
- `nutripath/` — the actual Next.js 14 (App Router) + TypeScript app. All commands below run from here.

## Commands (from `nutripath/`)

```bash
npm run dev                                   # dev server on :3000
npm run build                                 # production build (also type-checks)
npm test                                      # vitest run (tests/**/*.test.ts)
npx vitest run tests/safety/allergens.test.ts # single test file
npx vitest run -t "blocks peanuts"            # single test by name
npx prisma generate                           # after editing prisma/schema.prisma
npx prisma migrate dev --name <name>          # create + apply a migration
```

No lint script is configured. Path alias `@/` maps to `nutripath/` (tsconfig + vitest.config.ts).

Env (`.env.local` / `.env`): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `USDA_API_KEY`. Server keys must never get a `NEXT_PUBLIC_` prefix.

## Architecture

**Auth vs. data are split:** Supabase handles auth only (`lib/supabase/server.ts` for route handlers/server components, `client.ts` for the browser). All app data goes through Prisma (`lib/prisma.ts` singleton) against the Supabase Postgres DB. Route handlers get the Supabase session, then `prisma.user.upsert` by **email** to find the app `User` row — there is no foreign key to the Supabase auth user id.

**Routing & gating:** `middleware.ts` refreshes the session, redirects unauthenticated users on app routes to `/login`, and redirects users without a profile to `/onboarding`. "Has profile" is a cookie (`nutripath_has_profile=1`) set by `POST /api/profile` and `GET /api/profile/me`, not a DB lookup — if you add a protected route, add its prefix to the `isAppRoute` list in middleware. Pages live under `app/(app)/` (authenticated shell with NavBar + "Not medical advice" footer) and `app/(auth)/`.

**Deterministic safety layer (`lib/safety/`)** — never delegated to the AI, every rule has a test in `tests/safety/`:
- `runSafetyRules(food, profile)` merges food-level checks (allergens, medications, missing-data) into `{ level: 'ok'|'warn'|'block', warnings }`.
- `checkCalorieFloor` (day-level, `CALORIE_FLOOR = 1200`) and `checkSensitiveConditions` (profile-level: pregnant / kidney disease / insulin / ED history → general-only mode) are called separately by callers.
- Missing data must produce a warning, never an assumption of safety.

**AI meal plans:** `lib/ai.ts` wraps the Anthropic SDK (docs/README still say OpenAI — the code uses Claude). The model returns **meal names + ingredients only, never numbers**, and receives only cuisine/preference/allergen/care-team-flag labels (no medications, no PII). `app/api/ai/meal-plan/route.ts` then looks up each ingredient in USDA, runs `runSafetyRules`, drops blocked ingredients, retries the plan (max 2) if >50% of a meal is blocked, and computes all nutrients from USDA data. Types: `types/meal-plan.ts` (`Raw*` = AI output, `Verified*` = post-check).

**Goals (`lib/goals.ts`):** deterministic — `deriveGoals` (DGA baseline + care-team-flag adjustments), `suggestGoalsFromHistory` (keyword matching on free-text history), `calcCaloricTarget` (BMI/activity/intensity, clamped to its own sex-based floor of 1200 F / 1500 M, separate from `CALORIE_FLOOR`). Weight loss is never a default.

**External data:** USDA FoodData Central (`lib/usda.ts`, proxied via `app/api/usda/*`) is the only source of nutrition numbers; CMS NPI Registry for dietitians (taxonomy `133V00000X`, `app/api/npi/search`) with language/culture filters on clearly labeled demo data; OpenStreetMap Nominatim for `/api/nearby-stores`. `data/seed-foods.ts` is a static cuisine-tagged list backing the "foods that fit" page.

**Fixed lists** (allergens = FDA major 9, care-team flags = `CareTeamFlag` enum) are duplicated in `prisma/schema.prisma`, zod schemas in `app/api/profile/route.ts`, and the UI (`components/ProfileWizard.tsx`) — keep them in sync. Cuisines, religious rules, preferences, and medications are intentionally free-text.

## Conventions

- Copy must follow GUIDELINES "Wording": supportive, no "good/bad foods", "cheat day", "burn it off"; phrase as "your care team mentioned…", never "you have…".
- No streaks/rewards for eating less; respect `hideCalories`.
- Route handlers validate input with zod.
