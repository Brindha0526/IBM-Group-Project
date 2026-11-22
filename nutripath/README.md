# NutriPath

A companion web app for eating well before and after a dietitian visit.  
Not medical advice. Always consult your healthcare team.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres + Auth) |
| ORM | Prisma |
| AI | OpenAI GPT-4o-mini (server-side only) |
| Nutrition data | USDA FoodData Central |
| Dietitian directory | CMS NPI Registry |
| Testing | Vitest |
| Deployment | Vercel |

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd nutripath
npm install
```

### 2. Set up environment variables

Copy the template below into a new file called **`.env.local`** at the project root and fill in your values.

> **`.env.local` must never be committed.** It is already listed in `.gitignore`.

```env
# ── Supabase ─────────────────────────────────────────────────────────────────

# Supabase Postgres connection string — used by Prisma at runtime
# Append ?pgbouncer=true&connection_limit=1 when connecting through the
# Supabase connection pooler (required for serverless / Vercel deployments)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

# Direct Supabase Postgres URL — used by Prisma for migrations (bypasses pooler)
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase project URL and anon key — safe to expose to the browser (anon key only)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# ── External APIs (SERVER-SIDE ONLY) ─────────────────────────────────────────
# These keys must NEVER be prefixed with NEXT_PUBLIC_ — that would expose them
# to every browser that visits the app.

# OpenAI API key — used only inside Next.js Route Handlers for meal plan generation
OPENAI_API_KEY=sk-...

# USDA FoodData Central API key — used only inside Next.js Route Handlers
# Register for a free key at https://fdc.nal.usda.gov/api-guide.html
USDA_API_KEY=...
```

### 3. Run database migrations

You need a Supabase project before running migrations. Create one at [supabase.com](https://supabase.com), then:

```bash
# Generate Prisma client from schema
npx prisma generate

# Push the schema to your Supabase database (creates tables)
npx prisma migrate dev --name init
```

### 4. Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run Vitest unit tests |

---

## Manual steps required after cloning

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and copy the connection strings and keys into `.env.local`.
2. **Run `npx prisma migrate dev --name init`** to push the schema to your Supabase Postgres database.
3. **Enable Email/Password auth** in your Supabase project dashboard under Authentication → Providers.
4. **Obtain a USDA FoodData Central API key** at [https://fdc.nal.usda.gov/api-guide.html](https://fdc.nal.usda.gov/api-guide.html) (free).
5. **Obtain an OpenAI API key** at [https://platform.openai.com](https://platform.openai.com) (Phase 2, ST-7).

---

## Folder structure

```
app/
  (auth)/
    login/page.tsx          ← email/password sign-in
    signup/page.tsx         ← sign-up with 18+ confirmation
  (app)/
    layout.tsx              ← authenticated shell, navbar, "Not medical advice" footer
    profile/page.tsx
    goals/page.tsx
    log/page.tsx
    foods/page.tsx
    plan/page.tsx
    grocery/page.tsx
    summary/page.tsx
    find-dietitian/page.tsx
  api/
    usda/                   ← USDA FoodData Central proxy (server-side)
    npi/                    ← CMS NPI Registry proxy (server-side)
    ai/                     ← OpenAI meal plan generation (server-side)
lib/
  supabase/
    server.ts               ← Supabase client for Server Components / Route Handlers
    client.ts               ← Supabase client for Client Components
  safety/index.ts           ← runSafetyRules() — deterministic, no AI
  usda.ts                   ← USDA FoodData Central client
  npi.ts                    ← CMS NPI Registry client
  ai.ts                     ← OpenAI client wrapper
  goals.ts                  ← deriveGoals() / suggestGoalsFromHistory()
prisma/
  schema.prisma             ← Full data model
tests/
  safety/                   ← Vitest unit tests (100% coverage target for safety rules)
types/                      ← Shared TypeScript types
components/                 ← Shared UI components
middleware.ts               ← Session refresh + auth redirect
```

---

## Safety notes

- `OPENAI_API_KEY` and `USDA_API_KEY` are **never** prefixed with `NEXT_PUBLIC_`.
- All nutrition numbers come from USDA FoodData Central; the source is shown in the UI.
- Every AI suggestion is verified by `runSafetyRules()` before display.
- The app never diagnoses; it defers to the user's care team.
- Users must confirm they are 18+ during sign-up.
- A "Not medical advice" notice appears during setup and in the footer of every authenticated page.
