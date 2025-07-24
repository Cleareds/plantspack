# VeganConnect - Social Network for Vegans

A modern, full-stack social network built specifically for the vegan community, featuring social posts, interactive maps with vegan-friendly places, and comprehensive user management.

## Features

### ✅ Completed Features
- **User Authentication**: Email/password, Google OAuth, Facebook OAuth with secure password protection
- **User Profiles**: Customizable profiles with bio, name, username management
- **Social Posts**: 500-character posts with public/friends privacy settings
- **Public Feed**: Browse posts without authentication required
- **Interactive Map**: Leaflet-based map showing vegan restaurants, events, museums, and pet-friendly places
- **Favorite Places**: Users can save favorite locations
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live feed updates and interactions

### 🚧 In Development
- **Social Features**: Follow/unfollow system, comments on posts
- **Place Management**: Full CRUD operations for map locations
- **Enhanced Security**: Additional input validation and rate limiting
- **Performance Optimization**: Image optimization, caching strategies
- **Mobile App Preparation**: PWA configuration for future mobile app

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Map Integration**: React Leaflet, OpenStreetMap
- **Icons**: Lucide React
- **Authentication**: Supabase Auth with social providers

## Database Schema

```sql
- users (profiles, authentication data)
- posts (social media posts with privacy settings)
- comments (post comments)
- follows (user follow relationships)
- post_likes (post likes/favorites)
- places (vegan locations with categories)
- favorite_places (user's saved places)
```

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### 2. Clone Repository
```bash
git clone <repository-url>
cd vegan-social
npm install
```

### 3. Supabase Setup
1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Enable Authentication providers (Google, Facebook) in Supabase Auth settings
4. Get your project URL and anon key from Supabase settings

### 4. Environment Configuration
Create `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

### 5. OAuth Setup (Optional)
For Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Add client ID/secret to Supabase and environment variables

For Facebook OAuth:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app and set up Facebook Login
3. Add OAuth redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Add app ID/secret to Supabase and environment variables

### 6. Run Development Server

**Option A: Use Remote Supabase (Production-like)**
```bash
npm run dev
```

**Option B: Use Local Supabase (Recommended for Development)**
```bash
# First time setup - requires Docker
npm run db:start    # Start local Supabase services
npm run db:seed-js   # Populate with test data

# For development
npm run dev:full     # Start both Supabase and Next.js
```

Visit http://localhost:3000

### 7. Local Development with Test Data

For the best development experience, use local Supabase with dummy data:

1. **Install Docker** (required for local Supabase)
2. **Start local services**: `npm run db:start`
3. **Add test data**: `npm run db:seed-js`
4. **Start development**: `npm run dev`

You'll have 5 test users you can log in with:
- emma@veganlife.com / password123
- marcus@plantbased.org / password123
- lily@herbivore.net / password123
- david@sprouts.com / password123
- sofia@quinoalover.com / password123

See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed setup instructions.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── auth/           # Authentication pages
│   ├── map/            # Map page
│   ├── profile/        # User profiles
│   └── settings/       # User settings
├── components/         # React components
│   ├── auth/          # Authentication forms
│   ├── layout/        # Layout components
│   ├── map/           # Map components
│   └── posts/         # Social post components
└── lib/               # Utilities and configurations
    ├── auth.tsx       # Authentication context
    ├── supabase.ts    # Supabase client
    └── database.types.ts # TypeScript types
```

## Key Features Explained

### Authentication System
- **Multi-provider**: Email/password, Google, Facebook
- **Secure**: Row Level Security (RLS) policies
- **Flexible**: Username or email login
- **Protected Routes**: Middleware-based route protection

### Social Feed
- **Public Access**: Non-authenticated users can browse public posts
- **Privacy Controls**: Posts can be public or friends-only
- **Real-time**: Live updates using Supabase real-time
- **Character Limit**: 500 characters max per post

### Interactive Map
- **OpenStreetMap**: Free, open-source mapping
- **Categories**: Restaurants, events, museums, other
- **Pet-Friendly**: Special marking for pet-friendly locations  
- **User Contributions**: Users can add new places
- **Favorites**: Save and manage favorite locations

### Performance & Mobile
- **SSR/SSG**: Next.js server-side rendering
- **Mobile-First**: Responsive design with Tailwind CSS
- **Progressive Enhancement**: Works without JavaScript
- **Future PWA**: Prepared for mobile app conversion

## Security Features

- **Row Level Security**: Database-level access control
- **Input Validation**: Client and server-side validation
- **Secure Authentication**: Supabase managed auth
- **CSRF Protection**: Built-in Next.js protection
- **Environment Variables**: Secure configuration management

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
Works with any Node.js hosting platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Future Enhancements

### Phase 1 (Short-term)
- [ ] Complete social features (follow/unfollow, comments)
- [ ] Full place management CRUD
- [ ] Image uploads for posts and places
- [ ] Push notifications

### Phase 2 (Medium-term)  
- [ ] Advanced search and filtering
- [ ] Event management system
- [ ] Direct messaging
- [ ] Mobile app (React Native)

### Phase 3 (Long-term)
- [ ] Community groups and forums
- [ ] Recipe sharing platform
- [ ] Local vegan business directory
- [ ] Integration with delivery services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions, issues, or feature requests, please create an issue in the GitHub repository.

---

**Built with ❤️ for the vegan community**
