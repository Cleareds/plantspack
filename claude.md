# Claude Code Access & Configuration

This file documents the CLI tools and access that Claude Code has for this project.

## Authenticated CLI Tools

All the following CLI tools are installed and authenticated on this machine:

### 1. Vercel CLI
- **Status**: ✅ Authenticated
- **User**: antonkravchuk-4102
- **Version**: 33.5.1
- **Capabilities**:
  - Deploy to production: `vercel deploy --prod`
  - Check deployment logs: `vercel logs`
  - View project info: `vercel project ls`
  - Manage environment variables
  - Check build status

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

### 4. Supabase CLI
- **Status**: ✅ Authenticated
- **Version**: 2.67.1
- **Organization**: ptaoqgevccjhnasapenf
- **Projects**: Multiple projects accessible (fantasy-check, etc.)
- **Capabilities**:
  - List projects: `supabase projects list`
  - Run migrations: `supabase db push`
  - Execute queries: `supabase db query`
  - Check database status
  - View logs: `supabase logs`
  - Manage functions and storage

## Project Information

- **Repository**: plantspack
- **Current Branch**: main
- **Working Directory**: /Users/antonkravchuk/sidep/Cleareds/plantspack

## Permissions

Claude Code has full access to:
- Deploy directly to production via Vercel
- Push code and create PRs via GitHub
- Check and debug Stripe webhooks and payments
- Manage Supabase database, migrations, and queries
- View logs across all services
- Build and test the application

## Notes

- All CLI tools are authenticated and ready to use
- Claude can execute production deployments when requested
- Database queries and migrations can be run directly
- Logs can be checked across all services for debugging
