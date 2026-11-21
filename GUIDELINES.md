# GUIDELINES.md

Rules and context that every part of this app, and every Bob task, must follow.

## What the app is

- A companion for before and after a dietitian visit. It is **not** a nutritionist and **never** diagnoses.
- **Before path:** the user enters their constraints and gets a healthy eating plan based on the Dietary Guidelines for Americans.
- **After path:** the user picks what their dietitian or doctor told them from a fixed list, and the app tailors their diet to match.
- **Find a dietitian:** when users are ready, the app helps them find registered dietitians by location, with filters for language and cultural expertise.
- **Main job:** help users follow through on a plan consistently.
- **What makes us different:** plans are built around each user's culture, values, and food preferences, not one-size-fits-all.

## How dietitians approach clients (from our interview)

| What the dietitian told us | What the app does |
| --- | --- |
| She learns medical history, preferences, restrictions, and allergies before advising | No suggestions until the profile is complete |
| People assume they need to lose weight, which often isn't their real need | Weight loss is never the default goal |
| People usually see a doctor first; diagnosis happens there | The app defers to the user's care team |
| Advice sticks when it fits lifestyle, identity, and values | Plans adapt to culture, values, schedule, and budget |
| Strict meal plans are only right for some people | Default to flexible suggestions |
| On a budget, she finds cheaper healthy substitutes | Offer "cheaper swap" suggestions |
| Trends like maxing protein or buying fat-free ignore the individual | No "more protein is always better," no praising "fat-free" |
| You can't spot disordered eating by looking; dietitians use questionnaires | Watch behavior, never weight or appearance; never diagnose |
| She avoids words like "fat" that make people feel judged | Supportive wording only (see Wording) |
| Tracking apps often overestimate | All numbers from USDA, with the source shown |
| The biggest gap is follow-through, not advice | Check-ins and summaries focused on consistency |

## Safety rules

These are deterministic code, never left to the AI, and every rule has a unit test.

1. **No diagnosis, no lab interpretation.** The app only acts on what the user says a professional told them, from the fixed list below.
2. **Safety rules beat entered advice.** If entered advice conflicts with a rule, keep the rule and tell the user to follow their care team directly.
3. **Allergens are blocked** from all plans and suggestions. USDA does not label allergens, so we keep our own list of allergen names and hidden ingredients.
4. **Known food-medication conflicts are flagged** with "check with your pharmacist."
5. **Adults only (18+).** Users who are pregnant, have kidney disease, take insulin, or have an eating disorder history get general suggestions only and are pointed to their care team.
6. **No supplement doses.** Suggest foods only; for supplements, say to ask a doctor.
7. **Eating-disorder protections:**
   - Never plan below the minimum daily calorie floor.
   - No praise, streaks, or rewards for eating less.
   - Several days of very low intake trigger a supportive message and resources.
   - Users can hide calorie numbers.
8. **When data is missing, warn.** Never assume a food is safe.
9. **"Not medical advice"** appears during setup and in the footer.

## AI's role

- The AI suggests meals and writes friendly explanations.
- Code looks up every number in USDA FoodData Central, checks goals, and runs the safety rules. Anything that fails is dropped or regenerated.
- The AI never produces nutrition numbers and never interprets lab results.

## Find a dietitian

- Results come from the CMS NPI Registry API, filtered to the registered dietitian code 133V00000X.
- Never call a listing "licensed" or "verified." A listing means someone is registered as a dietitian, not that their license was checked.
- Filter by language spoken and cultural or cuisine expertise, never by a dietitian's ethnicity or national origin.
- The NPI Registry has no language or cultural data, so those filters use sample data, clearly labeled as demo data in the app.

## Wording

- Supportive and progress-focused, never guilt.
- Banned: "fat" as a judgment, "good/bad foods," "cheat day," "burn it off."
- Say "your care team mentioned low iron," never "you have low iron."

## Fixed lists

- **After-path flags:** low iron, low vitamin D, low B12, high cholesterol, high blood sugar, high blood pressure.
- **Allergens (FDA major 9):** milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, sesame.
- **Food-medication conflicts:** TODO, keep it short and from official sources. Starting candidates: warfarin and vitamin K-rich foods, MAOIs and aged or fermented foods, grapefruit and certain statins.
- **Medication dropdown:** TODO, the medications from the conflicts list.
- **Calorie floor:** TODO, pick a value from an official source.

## Sources

- USDA FoodData Central (fdc.nal.usda.gov): every nutrition number
- Dietary Guidelines for Americans (dietaryguidelines.gov) and MyPlate (myplate.gov): general advice and default goals
- NIH Office of Dietary Supplements fact sheets (ods.od.nih.gov): which foods are rich in which nutrients
- FDA food allergen information (fda.gov): the allergen list
- MedlinePlus (medlineplus.gov): food-medication information
- CMS NPI Registry (npiregistry.cms.hhs.gov): the dietitian directory

## Data and privacy

- API keys stay on the server; `.env` is in `.gitignore`.
- The AI model gets only the profile details a suggestion needs.
- No real personal data in the demo.
- Users can delete their data.
