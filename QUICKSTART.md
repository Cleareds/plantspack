# VeganConnect - Quick Start Guide

Get VeganConnect running locally in 5 minutes with full test data! 🚀

## Prerequisites ✅

- **Node.js 18+** 
- **Docker** (for local Supabase)
- **Git**

## Quick Setup 🏃‍♂️

```bash
# 1. Clone and install
git clone <your-repo-url>
cd vegan-social
npm install

# 2. Start local Supabase (requires Docker)
npm run db:start

# 3. Add test data (if you get migration errors, use standalone)
npm run db:seed-js
# OR if migration errors occur:
npm run db:standalone

# 4. Start the app
npm run dev
```

**🎉 That's it! Visit http://localhost:3000**

## Test It Out 🧪

### Login with Test Users
- **Emma Green**: emma@veganlife.com / password123
- **Marcus Plant**: marcus@plantbased.org / password123
- **Lily Herbs**: lily@herbivore.net / password123
- **David Sprouts**: david@sprouts.com / password123
- **Sofia Quinoa**: sofia@quinoalover.com / password123

### What You'll See
- **Homepage**: 14 sample posts from different users
- **Map**: 11 vegan places in San Francisco
- **Profiles**: Complete user profiles with bios
- **Interactions**: Likes, comments, follows already set up

### Try These Features
1. 📝 **Create a post** (public or friends-only)
2. 🗺️ **Explore the map** at `/map`
3. ❤️ **Like and comment** on posts
4. 👤 **Visit user profiles** (e.g., `/profile/emmagreen`)
5. ⚙️ **Edit your profile** at `/settings`
6. 🏛️ **Browse without login** (sign out to test)

## What's Included 📦

- **5 Test Users** with complete profiles
- **14 Sample Posts** (mix of public/private)
- **11 Vegan Places** (restaurants, events, museums)
- **Follow Relationships** between users
- **Post Likes & Comments** for realistic engagement
- **Favorite Places** for each user

## One-Line Development 💻

After initial setup, just run:
```bash
npm run dev:full
```

This starts both Supabase and Next.js together.

## Useful Services 🛠️

- **App**: http://localhost:3000
- **Database GUI**: http://localhost:54323
- **API Docs**: http://localhost:54321/rest/v1/

## Need Help? 🆘

### Common Issues

**Error: "must be owner of table users"**
This is fixed! The migration has been updated to avoid auth.users conflicts.

**Error: "psql: command not found"**
This is fixed! The standalone setup now uses JavaScript instead of psql.

**Error: "Cannot connect to Docker daemon"**
Make sure Docker is installed and running: `docker ps`

**No test users appear**
Try: `npm run db:create-users` to create auth users separately

**Database problems**
Reset everything: `npm run db:seed-js`

**Build errors**
The app builds successfully with: `npm run build`

### More Help
- See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed setup
- Check [README.md](./README.md) for full documentation

## Next Steps 🚶‍♂️

1. **Explore the code** in `src/` directory
2. **Make changes** and see them live reload
3. **Add new features** using the existing patterns
4. **Deploy** when ready (works with Vercel out of the box)

---

**Happy coding! 🌱** Build amazing vegan communities! 🌍