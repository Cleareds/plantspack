# Claude Code Access & Configuration

This file documents the CLI tools and access that Claude Code has for this project.

## 📥 Task queueing: "Next task:" pattern

When the user writes `Next task: <description>` anywhere in a message (case-sensitive on "Next task:"), treat it as a request to queue `<description>` as a new high-priority task at the top of the todo list — **even if they also include other content in the same message**.

Behavior:
1. Invoke the `next-task` skill (`.claude/skills/next-task/SKILL.md`) once per `Next task:` occurrence.
2. The skill calls `TaskCreate` and pushes every other pending task behind the new one via `addBlocks`.
3. If a task is currently `in_progress`, **do not interrupt it**. Finish it, then pick up the newly queued item.
4. Briefly acknowledge in the response: `Queued: <subject>. Will start <now | after current task>.`
5. If the message contains other non-"Next task" content, address that content normally *after* queuing.

This pattern lets the user interleave priorities without us losing track.

## 🚫 ABSOLUTE RULE: Never Delete Data

**NEVER delete any data from the database (places, posts, users, recipes, reviews, or any other records) unless the user explicitly confirms by saying "Yes delete."**

- Do NOT delete places, even if they seem irrelevant, spammy, or incorrectly added
- Do NOT delete posts, comments, reviews, or any user-generated content
- Do NOT run DELETE queries as part of cleanup, migration, or import operations
- If data seems wrong, ASK the user first and wait for "Yes delete" confirmation
- This applies to ALL tables in Supabase — no exceptions
- Batch imports must use a unique `source` tag so they can be rolled back without affecting other data

**This rule overrides all other instructions. There are no circumstances where silent deletion is acceptable.**

## 🚫 ABSOLUTE RULE: Honesty About the Platform — No Marketing Bullshit

**Never write claims about PlantsPack that aren't literally true of the current data and product.** This applies to marketing copy, executive summaries, landing pages, social posts, emails, pitch decks, partner outreach, and any user-facing or external-facing text.

What this means in practice:
- Do NOT say "every place has a labelled vegan menu" — many places are imported from OSM/Foursquare/VegGuide and not yet verified or labelled. Only `fully_vegan` places that have been manually verified carry that signal; the rest carry whatever the source data said, which may be incomplete.
- Do NOT claim verification, ratings, reviews, traffic, user counts, or partnerships at higher numbers than the DB actually reflects. If the user count is 43, write 43 (or "early-stage" if a number is awkward) — never round up, never imply more.
- Do NOT use words like "every", "all", "guaranteed", "verified" unless that is provably true for 100% of the relevant rows.
- Do NOT invent features that don't exist yet (claim flow, business dashboard, API, mobile app) — describe what is actually shipped.
- Do NOT describe aspirational behavior as current behavior. If something is planned for next month, say "planned" or omit it.
- When in doubt, UNDERSELL. Honest understatement beats inflated claims that get caught.

When writing copy about the platform:
1. Check the DB or code for actual counts, states, and feature presence before writing numbers or claims.
2. Use hedged language for anything not 100% verified: "many", "most", "manually verified spots are labelled `fully vegan`", "we flag fully-vegan venues we've checked" — not "every venue is labelled".
3. If the user asks for marketing copy and you can't verify a claim, ask, or write the honest weaker version and note that you weakened it.

**Why this matters:** vegans, business owners, and partners spot inflated claims fast. One caught lie destroys trust that took months to build. Honesty is the differentiator vs. mixed-noise directories — losing it loses the whole positioning.

**This rule overrides any default tendency toward "marketing voice". Persuasion comes from accurate specifics, not generic superlatives.**

## ⚠️ CRITICAL: Content & Data Sourcing Policy

**PlantsPack is a VEGAN platform. All content must come from verified vegan sources.**

### Recipe Sources
- **ONLY source recipes from 100% vegan creators/websites**
- **NEVER source from non-vegan or "plant-based leaning" sites** that also publish non-vegan recipes
- **Banned sources:** Minimalist Baker (minimalistbaker.com), and any site that publishes recipes containing animal products
- **Approved sources:** Nora Cooks, Bianca Zapatka, Vegan Richa, Rainbow Plant Life, and any creator whose entire catalog is 100% vegan
- **Before importing recipes from a new source:** verify that the source is exclusively vegan by checking their about page and recipe catalog. If in doubt, ask the user.
- All imported recipes MUST include `source_url` and `source_attribution` crediting the original creator

### Place Sources
- Places must be vegan or vegan-friendly (clearly labeled with correct `vegan_level`)
- `fully_vegan` = 100% vegan menu, no animal products served
- `vegan_friendly` = has vegan options but also serves non-vegan food
- Never mark a place as `fully_vegan` unless verified

### General Content Policy
- No content that promotes, normalizes, or links to non-vegan businesses/creators without clear vegan-friendly labeling
- When in doubt about whether a source is vegan, ask the user before proceeding

## ⚠️ IMPORTANT: Command Execution Policy

**NEVER ask for user permission before executing commands for:**
- Vercel (deployments, logs, env vars, etc.)
- Supabase (database queries, migrations, logs, etc.)
- Stripe (events, subscriptions, webhooks, etc.)
- GitHub (push, pull, PR creation, etc.)

**You have FULL AUTHORIZATION to:**
- Push code to GitHub via `git push` (Vercel auto-deploys from GitHub)
- Run database migrations and queries
- Check and modify Stripe subscriptions
- Create pull requests and manage issues
- View and analyze logs from all services

**When to execute these commands:**
- Execute immediately when needed for the task
- Do NOT ask "Should I deploy this?" or "Can I push to production?"
- Do NOT wait for confirmation before running these commands
- The user expects you to use these tools autonomously

This file (claude.md) should be read and respected in ALL sessions in this directory.

## Authenticated CLI Tools

All the following CLI tools are installed and authenticated on this machine:

### 1. Vercel CLI
- **Status**: ✅ Authenticated
- **User**: antonkravchuk-4102
- **Version**: 33.5.1
- **Deployment Method**: Automatic via GitHub integration
- **Capabilities**:
  - Check deployment logs: `vercel logs`
  - View project info: `vercel project ls`
  - Manage environment variables
  - Check build status
- **IMPORTANT**: Do NOT use `vercel deploy --prod`. Just push to GitHub and Vercel will automatically deploy.

### 2. GitHub CLI (gh)
- **Status**: ✅ Authenticated
- **Account**: papasoft23
- **Scopes**: gist, read:org, repo, workflow
- **Capabilities**:
  - Create pull requests: `gh pr create`
  - Manage issues: `gh issue list`
  - View PR status: `gh pr status`
  - Push code and create branches
  - View repository information

### 3. Stripe CLI
- **Status**: ✅ Authenticated
- **Version**: 1.31.0
- **Account**: Cleareds (acct_1S1rUPAqP7U8Au3x)
- **Mode**: Both test and live mode keys configured
- **Capabilities**:
  - View webhooks: `stripe webhooks list`
  - Check events: `stripe events list`
  - Test webhooks locally: `stripe listen`
  - Manage products and subscriptions
  - View logs and debug payment issues

### 4. Supabase CLI & Admin Access
- **Status**: ✅ Authenticated
- **Version**: 2.67.1
- **Organization**: ptaoqgevccjhnasapenf
- **Project**: plantspack (mfeelaqjbtnypoojhfjp)
- **Database Access**: ✅ Full admin access via service role key
- **Capabilities**:
  - List projects: `supabase projects list`
  - Run migrations: `supabase db push`
  - Execute queries: `supabase db query`
  - Check database status
  - View logs: `supabase logs`
  - Manage functions and storage
  - **Execute raw SQL**: Via admin client or scripts
  - **Apply migrations**: Create and run migration files
  - **Fix RLS policies**: Update security policies as needed

### 5. Running SQL Migrations

**You MUST run SQL migrations directly when:**
- RLS policies need fixes
- Schema changes are required
- Database issues need immediate fixes

**How to run SQL:**
1. Create TypeScript script using `@supabase/supabase-js` with service role key
2. Execute SQL via admin client
3. Or use `supabase db push` to apply migration files
4. Test the changes immediately after applying

**Example:**
```typescript
const supabase = createClient(url, serviceRoleKey)
// Execute SQL or run migrations
```

**Project Details:**
- Service role key is in `.env.local`
- Project ref: `mfeelaqjbtnypoojhfjp`
- Migrations are in `supabase/migrations/`

## Project Information

- **Repository**: plantspack
- **Current Branch**: main
- **Working Directory**: /Users/antonkravchuk/sidep/Cleareds/plantspack

## Permissions & Authorization

Claude Code has FULL AUTONOMOUS ACCESS to:
- ✅ Push code to GitHub (Vercel auto-deploys, no confirmation needed)
- ✅ Create PRs via GitHub (no confirmation needed)
- ✅ Check and debug Stripe webhooks and payments (no confirmation needed)
- ✅ Manage Supabase database, migrations, and queries (no confirmation needed)
- ✅ View logs across all services (no confirmation needed)
- ✅ Build and test the application (no confirmation needed)
- ✅ Cancel/modify subscriptions in Stripe when debugging (no confirmation needed)
- ✅ Run database migrations in production (no confirmation needed)

## Autonomous Operation Guidelines

**DO:**
- Execute commands immediately when they're needed for the task
- Push commits to GitHub after making changes (Vercel auto-deploys)
- Run database migrations when schema changes are needed
- Check and modify Stripe data when debugging subscription issues
- Create PRs and push branches autonomously

**DO NOT:**
- Use `vercel deploy --prod` (causes duplicate deployments)
- Ask "Should I deploy this to production?" (auto-deploys from GitHub)
- Ask "Can I push these changes?"
- Ask "Do you want me to run this migration?"
- Wait for confirmation before using any of the CLI tools listed above

## Build & Deployment Optimization

**CRITICAL - Vercel Free Tier Resource Management:**
- ⚠️ **Vercel free tier: 1,000,000 function invocations/month** — we've hit this limit before
- ❌ **DO NOT push more than 1-2 times per session** — each push triggers a deployment which revalidates all ISR pages
- ❌ **DO NOT push rapid fix-after-fix commits** — batch all changes into ONE push at the end of a work session
- ❌ **DO NOT run local builds** (`npm run build`, `next build`) - They consume tokens unnecessarily
- ❌ **DO NOT enable Vercel cron jobs on free tier that run more than daily** — free tier only allows daily crons
- ✅ **DO accumulate commits locally** and push once when a chunk of work is complete
- ✅ **DO use aggressive caching** — prefer `revalidate: 3600` (1 hour) or higher for all SSR pages
- ✅ **DO use on-demand revalidation** (`revalidatePath`) instead of short timer-based ISR
- ✅ **Before pushing, ASK the user** if they want to deploy now or batch more changes

**Caching strategy:**
- SSR pages: `revalidate = 3600` (1 hour minimum)
- Score computation: `revalidate = 86400` (24 hours — scores rarely change)
- Use `revalidatePath()` in mutation APIs (add/edit/delete place) for instant cache busting
- Client-side features (search, follow, trips) hit Supabase directly — no Vercel function needed

**Token & Time Optimization:**
- ❌ **DO NOT wait for Vercel builds to complete** - Just push to GitHub and move on
- ✅ **DO verify deployment later** if needed using `vercel logs` or the Vercel dashboard

## Data Quality Rules

**Places:**
- **Chain policy (Platonic-form-is-vegan test)** — A chain restaurant belongs on PlantsPack if the Platonic form of what it sells is plant-based (açaí, bowl, salad, smoothie, coffee, sushi, Mexican bowl) OR it's a travel-staple with an explicit vegan menu (Leon, Itsu, Dean & David, Tortilla, Busaba, Wasabi, Yo! Sushi, Caffe Nero). It does NOT belong if the Platonic form of the dish is animal-centric (pizza, burger, steakhouse, fried chicken, seafood, diner/comfort food), even when a vegan option exists. Supermarkets and stores are always kept regardless of chain status. Places added by non-admin contributors are always kept regardless of chain status.
- Russian places are excluded from the platform
- Admin-imported places show "PlantsPack Team" attribution (username check: 'admin')
- Minimum 5 places for a city to appear in City Ranks
- All `fully_vegan` places should be verified (scan website for non-vegan menu items and run the `is <place> 100% vegan?` WebSearch per the add-place skill)
- Opening hours must be sorted Monday→Sunday
- Non-Latin city names must be translated to English

**Recipes:**
- Only from 100% vegan creators (see approved sources list above)
- Must include `source_url` and `source_attribution`
- Banned: Minimalist Baker

## Notes

- All CLI tools are authenticated and ready to use
- This project expects autonomous operation of all infrastructure tools
- The user will explicitly say if they want to review before deployment
- Logs can be checked across all services for debugging
- This configuration file (claude.md) persists across all sessions in this directory

## Token Usage Guidelines

**Be concise and efficient:**
- Keep responses brief and to the point
- Don't repeat code unnecessarily - reference by file path and line numbers
- Summarize large outputs instead of showing everything
- Use Grep with `head_limit` when searching (e.g., `head_limit: 20`)
- Only read files when necessary for the task
- When exploring, use Task tool with Explore agent instead of multiple reads

**Parallel operations:**
- Only use parallel tool calls when operations are truly independent
- Prefer sequential operations when one depends on another
- Don't speculatively read files "just in case"

**Communication:**
- Use bullet points and short paragraphs
- Reference code by file:line instead of showing full blocks
- Assume user can check files themselves when needed
- Skip excessive confirmations and explanations

## Session Handoff Notes (2026-04-26)

### Review findings to address early

1. `src/app/api/stripe/create-checkout-session/route.ts`
   The checkout route currently trusts `userId` from the request body and uses the service-role client without confirming the caller owns that account. Fix by deriving the acting user from the authenticated server session and rejecting mismatches.

2. `next.config.ts`
   The global `/api/:path*` header sets `Cache-Control: public`, which is unsafe as a default because authenticated endpoints like notifications return user-specific data. Default private/authenticated API routes to `no-store` and opt into caching only on explicitly public endpoints.

3. `src/app/api/cities/followed/route.ts`
   `GET /api/cities/followed` performs writes to `user_followed_cities`. Remove side effects from GET and move the `last_seen_*` update to an explicit mutation or async follow-up path.

4. `package.json` and `README.md`
   Tooling/docs drift exists: the repo is on Next 16 but `npm run lint` still uses `next lint`, which currently fails. Align linting with ESLint CLI, keep `eslint-config-next` in sync with the framework version, and refresh the root docs to match the actual stack.

### Place pipeline reuse note

Yes, the existing add-place pipeline can be reused for new regions, including Oahu.

- Preferred normalized geography for new entries: `city: Oahu`, `country: United States`
- Human-readable region/context: `Oahu, Hawaii, United States`
- Original-language user input such as `Гаваї, Сполучені Штати Америки` should be normalized to English before insert, per project rules
- Use the existing manual-add flow in `scripts/add-place.ts` plus the verification workflow in `docs/place-pipeline.md`
- For Oahu specifically, watch for district/neighborhood ambiguity (`Honolulu`, `Waikiki`, `North Shore`, etc.) and keep slugs/city naming consistent before batch import
