# PLAN.md — Dietitian Companion App

> Read GUIDELINES.md before touching any task. Every decision here is subordinate to the rules there.

---

## 1. Top-Level Overview

**Goal:** A web app that helps users eat well before and after a dietitian visit. It never diagnoses. All nutrition numbers come from USDA. Every AI suggestion is verified by deterministic code before it reaches the user.

**Two user paths:**
- **Before path** — user builds a profile (constraints, culture, allergens, medications), receives a healthy eating plan aligned with the Dietary Guidelines for Americans, and can search for a registered dietitian.
- **After path** — user picks flags from a fixed list (what their care team told them), and the app tailors goals and food suggestions to match.

**Core loop:** profile → goals → food log → daily check-in against goals → weekly summary.

**Who can use it:** anyone, regardless of background, cuisine, culture, or dietary practice. All cuisine and preference inputs are free-text — there is no predefined list that could exclude a user.

**MVP scope (by Nov 25):** features 1–5 (profile, goals, food logging + USDA lookup, safety rules, "foods that fit" lists).
**Feature freeze:** Dec 6 (features 6–9 added).
**Submission:** Dec 9.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one repo; API routes keep keys server-side; free Vercel hosting |
| Language | TypeScript | Type-safety on safety rules and USDA data shapes is non-negotiable |
| Styling | Tailwind CSS | Fast to build; no design-system cost |
| Database | Supabase (Postgres + Auth) | Free tier covers demo scale; row-level security; built-in auth; works well with Vercel |
| ORM | Prisma | Type-safe queries; easy schema migrations |
| AI | OpenAI GPT-4o-mini | Cheapest capable model; meal suggestions only — code does all number-checking |
| USDA API | FoodData Central REST | Authoritative nutrition source per guidelines |
| NPI API | CMS NPI Registry REST | Dietitian directory per guidelines |
| Testing | Vitest | Fast; works with TypeScript; safety rules need 100 % unit-test coverage |
| Deployment | Vercel | Free tier; zero-config Next.js |

**What stays server-side:** `OPENAI_API_KEY`, `USDA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Never shipped to the browser.

---

## 3. Folder Structure

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login / signup pages
│   ├── (app)/                  # Authenticated shell
│   │   ├── profile/            # Feature 1 — profile setup
│   │   ├── goals/              # Feature 2 — goal selection
│   │   ├── log/                # Feature 3 — food log + check-in
│   │   ├── foods/              # Feature 5 — "foods that fit"
│   │   ├── plan/               # Feature 6 — AI meal plan
│   │   ├── grocery/            # Feature 7 — grocery list + swaps
│   │   ├── summary/            # Feature 8 — weekly / appointment summary
│   │   └── find-dietitian/     # Feature 9 — NPI search
│   └── api/                    # Next.js route handlers (server-side only)
│       ├── usda/               # Proxy to FoodData Central
│       ├── npi/                # Proxy to CMS NPI Registry
│       ├── ai/                 # OpenAI meal-plan generation
│       └── safety/             # Safety-rule check endpoint (also used in tests)
├── lib/
│   ├── safety/                 # Feature 4 — deterministic safety rules
│   │   ├── allergens.ts        # Allergen block logic
│   │   ├── medications.ts      # Food-medication conflict flags
│   │   ├── calorie-floor.ts    # Eating-disorder protections
│   │   └── index.ts            # Unified runSafetyRules() export
│   ├── usda.ts                 # USDA FoodData Central client
│   ├── npi.ts                  # CMS NPI Registry client
│   ├── ai.ts                   # OpenAI client wrapper
│   └── goals.ts                # Goal-derivation logic (before/after path)
├── prisma/
│   └── schema.prisma           # Data model
├── tests/
│   └── safety/                 # Vitest unit tests — one file per safety rule
├── components/                 # Shared UI components
├── types/                      # Shared TypeScript types
├── .env.local                  # Never committed (in .gitignore)
└── GUIDELINES.md
```

---

## 4. Data Model

```prisma
// prisma/schema.prisma

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  createdAt       DateTime @default(now())
  profile         Profile?
  foodLogs        FoodLog[]
  goals           Goal[]
}

model Profile {
  id               String         @id @default(cuid())
  userId           String         @unique
  user             User           @relation(fields: [userId], references: [id])
  path             Path           // BEFORE | AFTER
  // Before-path fields
  budget           String?        // e.g. "low" | "medium" | "high"
  schedule         String?        // e.g. "busy_weekdays"
  cuisines         String[]       // free-text entries; any cuisine is valid — no fixed list
  religiousRules   String[]       // free-text e.g. ["halal", "kosher", "vegan"]
  preferences      String[]       // free-form tags
  allergens        String[]       // from fixed FDA major-9 list
  medications      String[]       // free-text entries; user types any medication name
  medicalHistory   String?        // optional free-text; used to suggest curated goals
  // After-path fields
  careTeamFlags    CareTeamFlag[] // from fixed list in GUIDELINES
  // Sensitive flags (triggers general-only mode)
  isPregnant       Boolean        @default(false)
  hasKidneyDisease Boolean        @default(false)
  takesInsulin     Boolean        @default(false)
  hasEdHistory     Boolean        @default(false)
  hideCalories     Boolean        @default(false)
}

model Goal {
  id              String     @id @default(cuid())
  userId          String
  user            User       @relation(fields: [userId], references: [id])
  nutrient        String     // e.g. "iron", "fiber", "sodium"
  targetMin       Float?
  targetMax       Float?
  unit            String     // e.g. "mg", "g"
  source          GoalSource // see enum below
  label           String?    // optional display name set by user e.g. "Eat more fibre"
  createdAt       DateTime   @default(now())
}

model FoodLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  loggedAt        DateTime @default(now())
  fdcId           String   // USDA FoodData Central ID
  foodName        String
  servingG        Float    // grams
  nutrients       Json     // snapshot of USDA nutrient data at log time
  safetyPassed    Boolean  // result of runSafetyRules() at log time
}

enum Path {
  BEFORE
  AFTER
}

enum GoalSource {
  GUIDELINES   // derived from Dietary Guidelines for Americans
  CARE_TEAM    // derived from a CareTeamFlag the user selected
  USER_DEFINED // the user typed in their own goal
  CURATED      // system-suggested from medical history text, confirmed by user
}

enum CareTeamFlag {
  LOW_IRON
  LOW_VITAMIN_D
  LOW_B12
  HIGH_CHOLESTEROL
  HIGH_BLOOD_SUGAR
  HIGH_BLOOD_PRESSURE
}
```

---

## 5. Safety Rules Module

Lives entirely in `lib/safety/`. Every function is pure (no network, no DB). Every function has a Vitest unit test. The safety rules run:
- When a food is logged
- When a meal plan is generated
- When "foods that fit" lists are built

The unified export is `runSafetyRules(food, profile): SafetyResult` which returns `{ pass: boolean, warnings: string[] }`.

**Rules implemented as code (never AI):**
1. **Allergen block** — if any ingredient name matches the FDA major-9 allergen list, block.
2. **Food-medication conflict** — normalize each user-entered medication name (lowercase, strip punctuation, trim), look it up in a hardcoded conflict map sourced from MedlinePlus. If matched: flag with "Check with your pharmacist before eating [food] while taking [medication]." If NOT in the map: return a standing notice — "We don't have specific conflict information for [medication] — check with your pharmacist before making dietary changes." Never assume no conflict.
3. **Calorie floor** — reject a day's plan if total falls below the floor (1,200 kcal/day).
4. **No supplement doses** — strip any supplement-dose text from AI output.
5. **Sensitive-condition guard** — if profile has a sensitive flag, return general suggestions only.
6. **Missing USDA data** — if nutrient data is absent, warn and do not assume safe.

---

## 6. AI Integration Pattern

```
User requests meal plan
        │
        ▼
  Build prompt (profile summary only — no PII beyond preferences)
        │
        ▼
  OpenAI GPT-4o-mini → returns meal names + ingredient list
        │
        ▼
  For each ingredient:
    └─ USDA FoodData Central lookup (server-side)
    └─ runSafetyRules(ingredient, profile)
    └─ if fail → drop ingredient / regenerate up to 2 times
        │
        ▼
  Assemble verified plan → return to client
```

The AI never produces a nutrition number. The AI never sees the user's medications or sensitive flags directly — only their cuisine/preference tags.

---

## 7. Prioritized Feature List & Timeline

### Phase 1 — MVP (complete by Nov 25)

| # | Feature | Key files |
|---|---|---|
| 1 | Profile (before/after path, free-text cuisines, allergens, free-text medications) | `app/(app)/profile/`, `prisma/schema.prisma` |
| 2 | Goals: user-defined, curated from medical history, or derived from guidelines/flags | `app/(app)/goals/`, `lib/goals.ts` |
| 3 | Food logging (USDA search, log entry, daily check-in) | `app/(app)/log/`, `lib/usda.ts`, `app/api/usda/` |
| 4 | Safety rules — deterministic code + unit tests | `lib/safety/`, `tests/safety/` |
| 5 | "Foods that fit" lists (filtered by culture, allergens, goals) | `app/(app)/foods/` |

### Phase 2 — Feature complete (by Dec 6)

| # | Feature | Key files |
|---|---|---|
| 6 | AI meal plan generator (GPT-4o-mini + USDA verify + safety check) | `app/(app)/plan/`, `lib/ai.ts`, `app/api/ai/` |
| 7 | Grocery list and cheaper swaps | `app/(app)/grocery/` |
| 8 | Weekly progress summary and appointment summary | `app/(app)/summary/` |
| 9 | Find a dietitian (NPI Registry, language/cultural filters marked as demo) | `app/(app)/find-dietitian/`, `lib/npi.ts`, `app/api/npi/` |

### Stretch (only if time permits after Dec 6)

| # | Feature |
|---|---|
| 10 | Advice import from pasted text or photo |

---

## 8. Non-Negotiables Checklist (from GUIDELINES.md)

- [ ] All nutrition numbers sourced from USDA FoodData Central, source shown in UI
- [ ] Every AI suggestion verified by `runSafetyRules()` before display
- [ ] Safety rules override entered advice; user is told to follow care team
- [ ] No diagnosis language anywhere in the app
- [ ] No supplement doses; link to "ask a doctor"
- [ ] Users confirm they are 18+ during signup
- [ ] Sensitive-condition users (pregnant, kidney disease, insulin, ED history) get general suggestions + care-team pointer only
- [ ] Eating-disorder protections: calorie floor enforced, no praise for eating less, low-intake streak triggers supportive message, calorie hide option
- [ ] "Not medical advice" shown during setup and in footer
- [ ] Allergens blocked from all plans (our own list; USDA does not label allergens)
- [ ] Food-medication conflicts flagged with "check with your pharmacist"; unknown medications get standing warning
- [ ] NPI listings never called "licensed" or "verified"
- [ ] API keys never sent to client
- [ ] No real personal data in demo
- [ ] Wording follows GUIDELINES: no "fat" as judgment, no "good/bad foods," no "cheat day," no "burn it off"
- [ ] Any cuisine, culture, or dietary practice is accepted — no predefined list excludes any background

---

## 9. Sub-Tasks (implementation order)

Each sub-task is designed to be completed and reviewed independently.

---

### ST-1 — Project Scaffold
**Status:** `[x] done`

**Intent:** Get a working Next.js + TypeScript + Tailwind + Supabase + Prisma project onto the main branch so every other sub-task has a stable base.

**Expected Outcomes:**
- `npx next dev` starts without errors
- Supabase auth (email/password) works; protected routes redirect unauthenticated users
- Prisma schema matches section 4; migrations run against a local/dev Supabase instance
- `npx vitest` runs (zero tests, zero failures)
- `.env.local` documented in README, never committed

**Todo List:**
1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router
2. Install and configure Prisma with Supabase connection string
3. Add `schema.prisma` from section 4
4. Run initial migration
5. Install Supabase JS client; set up auth helpers for Next.js App Router
6. Create `(auth)/login` and `(auth)/signup` pages (18+ confirmation on signup)
7. Create authenticated layout shell with "Not medical advice" footer
8. Install Vitest; add `vitest.config.ts`; confirm `npm test` passes

**Relevant Context:** Section 3 (folder structure), Section 4 (data model), GUIDELINES §Data and privacy

---

### ST-2 — Safety Rules Module
**Status:** `[x] done`

**Intent:** Implement every safety rule as pure, testable TypeScript before any feature that needs it. This unblocks food logging, "foods that fit," and the AI plan.

**Expected Outcomes:**
- `lib/safety/index.ts` exports `runSafetyRules(food, profile): SafetyResult`
- 100 % unit-test coverage for each rule file
- All tests pass in CI

**Todo List:**
1. Define `SafetyResult`, `FoodInput`, and `ProfileInput` types in `types/safety.ts`
2. Implement `allergens.ts` — block if any ingredient name matches the FDA major-9 list (from GUIDELINES)
3. Implement `medications.ts`:
   - Normalize each user-entered medication name (lowercase, strip punctuation, trim)
   - Look up against a hardcoded conflict map sourced from MedlinePlus (see Open Items for starting entries)
   - If matched: return a flag with "Check with your pharmacist before eating [food] while taking [medication]"
   - If NOT matched: return a standing-warning flag: "We don't have specific conflict information for [medication] — check with your pharmacist before making dietary changes"
   - Never assume no conflict for an unrecognized medication
4. Implement `calorie-floor.ts` — reject daily plan below 1,200 kcal/day; never reward eating less
5. Implement `sensitive-conditions.ts` — if profile has a sensitive flag, return general-only
6. Implement `missing-data.ts` — warn if USDA nutrient data is absent
7. Write Vitest tests in `tests/safety/` for every rule — including: known medication match, unknown medication (standing warning), no medication entered, edge cases, cross-rule interactions
8. Export unified `runSafetyRules()` from `lib/safety/index.ts`

**Relevant Context:** Section 5 (safety rules), GUIDELINES §Safety rules, GUIDELINES §Fixed lists, Open Items (medication conflict map)

---

### ST-3 — Profile (Feature 1)
**Status:** `[x] done`

**Intent:** Let users set up a complete profile (before or after path) so the app can produce personalised, safe suggestions. No suggestions are shown until the profile is complete (per GUIDELINES dietitian interview notes). The app must be open to everyone — cuisine and dietary preference inputs are free-text, not a fixed list.

**Expected Outcomes:**
- Multi-step profile wizard: path selection → constraints (before) or care-team flags (after) → allergens → medications → sensitive flags → confirmation
- Profile saved to DB; accessible via Supabase session
- Cuisine, religious/dietary rule, and preference inputs are free-text tag fields — any culture or background is valid
- Allergen checkboxes use the fixed FDA major-9 list
- Medication input is free-text; user types any medication name and adds it to their list
- "Not medical advice" shown on the confirmation step

**Todo List:**
1. Build multi-step wizard UI in `app/(app)/profile/`
2. Before-path step: budget, schedule, cuisine/cultural preferences (free-text tag input — type any cuisine), religious/dietary rules (free-text tag input), other preferences
3. After-path step: care-team flags (fixed list from GUIDELINES — checkboxes only, supportive wording)
4. Allergens step: FDA major-9 checkboxes
5. Medications step: free-text tag input — user types each medication name and adds it; helper text: "We use this only to flag possible food interactions. Always check with your pharmacist."
6. Sensitive flags step: pregnancy, kidney disease, insulin, ED history (each triggers a "we'll give you general suggestions" note)
7. Calorie-hide preference toggle
8. POST to `/api/profile` → upsert `Profile` in DB; validate with Zod
9. Redirect to goals setup on completion

**Relevant Context:** Section 4 (data model), GUIDELINES §Fixed lists, GUIDELINES §How dietitians approach clients

---

### ST-4 — Goals (Feature 2)
**Status:** `[x] done`

**Intent:** Give every user a goal-setting experience that works for their situation. Three entry points: (a) the user knows exactly what they want and types it in; (b) the user does not know and can optionally describe their medical history so the system can suggest curated goals from official guidelines for them to confirm; (c) goals are automatically derived from care-team flags (after path) or Dietary Guidelines defaults (before path). Goals drive the food log check-in and meal plan.

**Expected Outcomes:**
- Goals page offers three clearly labeled options:
  1. **"I have a specific goal"** — free-text input (e.g. "eat more iron-rich foods") mapped to a nutrient target by the system; user confirms before saving; saved with `source: USER_DEFINED`
  2. **"I'm not sure — help me"** — user optionally describes their medical history; `suggestGoalsFromHistory()` does keyword matching against a hard-coded map; user reviews and confirms each suggestion before saving; saved with `source: CURATED`
  3. **"Use my care-team advice"** (after path only) — auto-derives goals from `CareTeamFlag[]`; user can review and deselect; saved with `source: CARE_TEAM`
- `lib/goals.ts` exports `deriveGoals(profile): Goal[]` — deterministic, no AI
- `lib/goals.ts` exports `suggestGoalsFromHistory(text): SuggestedGoal[]` — keyword matching, no AI, no lab interpretation
- Goals page always also shows Dietary Guidelines baseline goals, labeled `source: GUIDELINES`, which the user may keep or dismiss
- User can add, edit, or remove any goal at any time

**Todo List:**
1. Research and hard-code Dietary Guidelines default nutrient targets in `lib/goals.ts` (source: dietaryguidelines.gov, myplate.gov)
2. Map each `CareTeamFlag` to nutrient adjustments (source: NIH ODS fact sheets)
3. Implement `deriveGoals(profile): Goal[]` for the auto-derive path
4. Build the keyword map for `suggestGoalsFromHistory()` — sourced from NIH ODS and MedlinePlus (see Open Items); deterministic, no AI, no diagnosis
5. Implement `suggestGoalsFromHistory(text): SuggestedGoal[]`
6. Build goal-entry UI in `app/(app)/goals/` with the three entry-point cards
7. Free-text goal card: text input → map to nutrient → show preview → user confirms
8. Medical history card: textarea → `suggestGoalsFromHistory()` → show suggested goal cards with checkboxes → user confirms selections
9. Care-team flags card (after path): auto-generate → review screen → confirm
10. Always display Dietary Guidelines baseline goals alongside user-set goals
11. POST to `/api/goals` → upsert `Goal[]` in DB; validate with Zod
12. Goals display: nutrient, target range, unit, source label, edit/delete button
13. "These suggestions come from general guidelines, not a diagnosis — not medical advice" notice on the medical history card

**Relevant Context:** Section 4 (data model, `Goal` and `GoalSource`), GUIDELINES §Sources, GUIDELINES §Safety rules rule 1 (no diagnosis)

---

### ST-5 — Food Logging + USDA Lookup (Feature 3)
**Status:** `[x] done`

**Intent:** Let users search for foods by name (proxied through the server to FoodData Central), log a serving, and see a daily check-in against their goals. USDA is the only source of nutrition numbers.

**Expected Outcomes:**
- `/api/usda/search?q=` returns USDA results (server-side, API key never exposed)
- `/api/usda/food/[fdcId]` returns full nutrient profile
- Users can log a food with a serving size; `runSafetyRules()` runs before saving
- Daily check-in page shows progress toward each goal nutrient; calories hidden if `hideCalories` is set
- USDA source shown in UI next to every number

**Todo List:**
1. Implement `lib/usda.ts` — `searchFoods(query)` and `getFoodDetail(fdcId)` using FoodData Central REST API
2. Create `app/api/usda/search/route.ts` and `app/api/usda/food/[fdcId]/route.ts`
3. Build food search UI with debounced input in `app/(app)/log/`
4. Log entry form: select food, enter serving (g), confirm
5. On log submit: fetch USDA nutrient data server-side → `runSafetyRules()` → save `FoodLog` with `safetyPassed` flag
6. Daily check-in view: aggregate today's logs against goals; show USDA source label
7. Respect `hideCalories` profile setting — never show calories if set
8. Low-intake streak detection: if 3+ days below calorie floor, show supportive message and resources

**Relevant Context:** Section 5 (safety rules integration), ST-2 (safety rules), GUIDELINES §Sources, GUIDELINES §Safety rules rule 7 and 8

---

### ST-6 — "Foods That Fit" Lists (Feature 5)
**Status:** `[x] done`

**Intent:** Show users a curated list of foods that match their goals, allergens, and cultural preferences — without AI. Because cuisine input is free-text, the seed dataset should be broad and culturally diverse, and filtering should use case-insensitive substring matching so any cultural background gets relevant results.

**Expected Outcomes:**
- Each food card shows: name, key nutrients (from USDA), cultural tags, allergen status
- Allergens from the user's profile are always blocked
- Foods are tagged with cuisine labels; the filter matches the user's free-text entries via case-insensitive substring matching — no background is excluded
- If a care-team flag or user-defined goal is set, foods rich in the relevant nutrient surface first
- Users can browse by nutrient category independently of their profile (e.g. "high iron," "high fibre")
- "No results for your filters" empty state with a suggestion to broaden the search or log a food manually

**Todo List:**
1. Define a `FoodItem` type: `{ fdcId, name, cuisineTags: string[], nutrientHighlights, allergenFlags }`
2. Build a seed dataset of ~100–150 foods spanning a wide range of global cuisines (no predefined list — prioritise breadth); look up each from USDA and store nutrient snapshots
3. Implement server-side filtering: allergen block, substring cuisine match against user's free-text entries, nutrient priority by goals/flags
4. Build `app/(app)/foods/` page — search bar, cuisine filter chips (auto-populated from user's entered cuisines), nutrient filter, results grid
5. Each card links to log that food
6. Empty-state component with "broaden filters" suggestion

**Relevant Context:** ST-2 (allergen block), ST-3 (free-text cuisine input), ST-4 (goals), GUIDELINES §AI's role (no AI in this feature)

---

### ST-7 — AI Meal Plan Generator (Feature 6)
**Status:** `[x] complete`

**Intent:** Let users request a 1-day or 7-day meal plan generated by GPT-4o-mini, where every ingredient is verified against USDA and passes `runSafetyRules()` before display.

**Expected Outcomes:**
- AI returns meal names and ingredient lists only — never nutrition numbers
- Every ingredient is looked up in USDA; any missing data triggers a warning, not assumption
- `runSafetyRules()` runs on every ingredient; failures are dropped and regeneration attempted (max 2 retries)
- Final plan shown with USDA-sourced nutrition totals and "Not medical advice" note

**Todo List:**
1. Design the OpenAI prompt template — include only cuisine tags, preferences, allergens (as exclusions), and care-team flags; never PII or medications directly
2. Implement `lib/ai.ts` — `generateMealPlan(profile, goals): RawMealPlan`
3. Implement server-side verification pipeline in `app/api/ai/meal-plan/route.ts`: AI → USDA lookup per ingredient → `runSafetyRules()` per ingredient → retry on failure → assemble verified plan
4. Build `app/(app)/plan/` UI — display plan with per-meal nutrient breakdown (USDA-sourced), allergen-safe badge, and care-team-flag alignment indicator
5. Add "save to grocery list" button on each meal

**Relevant Context:** Section 6 (AI integration pattern), ST-2, ST-5, GUIDELINES §AI's role

---

### ST-8 — Grocery List and Swaps (Feature 7)
**Status:** `[ ] pending`

**Intent:** Aggregate ingredients from a saved meal plan into a grocery list, with cheaper or culturally appropriate swap suggestions.

**Expected Outcomes:**
- Grocery list deduplicates ingredients and groups by category
- Each item can show a cheaper swap (from the seed dataset or USDA search)
- Swaps pass `runSafetyRules()` before display

**Todo List:**
1. Add `GroceryList` and `GroceryItem` to Prisma schema
2. Build `app/api/grocery/route.ts` — generate list from a saved meal plan
3. Implement swap logic: for each ingredient, find a cheaper alternative with similar nutrient profile from the seed dataset
4. Swaps pass `runSafetyRules()` before appearing
5. Build `app/(app)/grocery/` UI — checklist with swap reveal

**Relevant Context:** ST-6 (seed dataset), ST-7 (meal plan), GUIDELINES §How dietitians approach clients (budget swaps)

---

### ST-9 — Weekly Progress + Appointment Summary (Feature 8)
**Status:** `[ ] pending`

**Intent:** Give users a plain-language weekly summary of their progress against goals, and an appointment-ready summary they can share with their care team.

**Expected Outcomes:**
- Weekly summary shows nutrient goal hit-rates (not calorie streaks, no guilt language)
- Appointment summary: care-team flags, goals, notable food patterns — printable
- Wording follows GUIDELINES (no "good/bad," no "cheat," progress-focused)

**Todo List:**
1. Aggregate `FoodLog` entries for the past 7 days against `Goal` targets
2. Build weekly summary component with per-nutrient trend bars
3. Build appointment summary view — structured for a care-team conversation
4. Add print/export button
5. Respect `hideCalories` throughout

**Relevant Context:** ST-5 (food log data), ST-4 (goals), GUIDELINES §Wording

---

### ST-10 — Find a Dietitian (Feature 9)
**Status:** `[ ] pending`

**Intent:** Let users search for registered dietitians near them using the CMS NPI Registry, with language and cultural filters backed by demo data, clearly labeled as such.

**Expected Outcomes:**
- `/api/npi/search` proxies NPI Registry, filtered to taxonomy code `133V00000X`
- Results show name, address, NPI number — never "licensed" or "verified"
- Language and cultural-expertise filters use sample data, with a visible "demo data" label
- "Find a dietitian" is offered at the end of the before-path profile flow

**Todo List:**
1. Implement `lib/npi.ts` — `searchDietitians(location, filters)`
2. Create `app/api/npi/search/route.ts`
3. Build `app/(app)/find-dietitian/` with location input and filters
4. Add demo-data sample set for language/cultural filters; label clearly in UI
5. Ensure no listing is called "licensed" or "verified" anywhere in the UI

**Relevant Context:** GUIDELINES §Find a dietitian

---

## 10. Open Items (resolve before implementation)

| Item | Notes |
|---|---|
| Calorie floor value | Use 1,200 kcal/day — NIH/USDA minimum for adults. Hard-code as a named constant in `lib/safety/calorie-floor.ts` with a source comment. |
| Medication conflict map | Medications are free-text. The conflict map in `medications.ts` is a hardcoded lookup keyed by normalized medication name. Starting entries (source: MedlinePlus): **warfarin** → vitamin K-rich foods (spinach, kale, broccoli, Brussels sprouts); **MAOIs** (phenelzine, tranylcypromine, isocarboxazid) → aged/fermented foods (aged cheese, cured meats, soy sauce, beer, wine); **grapefruit-affected statins** (atorvastatin, simvastatin, lovastatin) → grapefruit and grapefruit juice; **lithium** → caffeine-heavy foods, low-sodium diets. Any medication entered by the user that is not in the map triggers the standing "check with your pharmacist" warning — we never assume no conflict. Expand the map with any other well-evidenced pairs before ST-2. |
| Medical history keyword map | Used by `suggestGoalsFromHistory()` in ST-4. Starting entries (source: NIH ODS, MedlinePlus): anaemia / anemia → iron goal; fatigue + B12 context → B12 goal; constipation / digestive → fibre goal; heart health / cholesterol / lipids → saturated fat limit + fibre goal; blood sugar / glucose / diabetes → carbohydrate quality + fibre goal; bone health / osteoporosis → calcium + vitamin D goals; blood pressure / hypertension → sodium limit. Must be agreed and documented before ST-4. |
| Seed dataset breadth | Target ~100–150 foods. No cuisine list is fixed — aim for staple ingredients spanning as many global cuisines as practicable. Priority nutrients to cover: iron, vitamin D, B12, fibre, calcium, sodium. |
| Demo data for NPI language/cultural filters | A small JSON fixture (~20–30 entries) with fictitious dietitian records, each with `languages: string[]` and `culturalExpertise: string[]`. Must be clearly labeled "Demo data — not real registry information" in the UI. Author before ST-10. |
