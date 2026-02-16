# Claude Code Access & Configuration

This file documents the CLI tools and access that Claude Code has for this project.

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

**IMPORTANT - Token & Time Optimization:**
- ❌ **DO NOT wait for Vercel builds to complete** - Just push to GitHub and move on
- ❌ **DO NOT run local builds** (`npm run build`, `next build`) - They consume tokens unnecessarily
- ✅ **DO push code and continue** - Vercel will build automatically in the background
- ✅ **DO verify deployment later** if needed using `vercel logs` or the Vercel dashboard

**Reasoning:**
- Vercel builds happen automatically on GitHub push
- Waiting for builds blocks progress and wastes time
- Local builds consume Claude's token budget without benefit
- Production builds are handled by Vercel's infrastructure

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