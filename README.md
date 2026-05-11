# 🌱 PlantsPack

**[plantspack.com](https://www.plantspack.com)** — a free, ad-free directory of
50,000+ vegan and vegan-friendly places across 10,000+ cities in 160+ countries,
with city-by-city vegan-friendliness rankings, community reviews, and a manually
verified "fully vegan" tier where each venue is hand-checked against its own menu.

No paid listings, no ads, no algorithmic recommendations sold to the highest
bidder. The project is community-funded; 50% of profit goes to animal welfare
causes.

Built with Next.js 15 (App Router) on top of Supabase / PostgreSQL, with PostGIS
for geospatial queries and Postgres full-text search for the autocomplete +
results page.

**Links:** [Website](https://www.plantspack.com) ·
[About](https://www.plantspack.com/about) ·
[Methodology](https://www.plantspack.com/methodology) ·
[Roadmap](https://www.plantspack.com/roadmap) ·
[Blog](https://www.plantspack.com/blog)

**Topics:** vegan · directory · plant-based · travel · food · maps · city
rankings · Next.js · Supabase · PostgreSQL · PostGIS

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📚 Documentation

All documentation is in the `/docs` folder:

- **[PRODUCTION_READY_FINAL_STATUS.md](docs/PRODUCTION_READY_FINAL_STATUS.md)** - Complete deployment guide
- **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment
- **[FEATURES_IMPLEMENTED.md](docs/FEATURES_IMPLEMENTED.md)** - All features list

## 🎯 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email, Google OAuth)
- **Payments:** Stripe
- **Error Tracking:** Sentry
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 🔑 Environment Variables

Copy `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

## 📦 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
```

## 🗄️ Database Setup

```bash
# Apply migrations
npx supabase db push

# See docs/DEPLOYMENT_GUIDE.md for details
```

## 📞 Support

- **Documentation:** `/docs` folder
- **Issues:** Check GitHub issues
- **Dashboard:** [Sentry](https://sentry.io/organizations/cleareds/)

## 📄 License

Private - All rights reserved

---

**Status:** Production Ready ✅  
**Version:** 1.0.0  
**Last Updated:** November 2025

