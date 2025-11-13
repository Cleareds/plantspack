# VeganConnect Mobile App

A React Native mobile application for the VeganConnect social network, built with Expo and TypeScript.

## Features

- 🔐 Authentication (Email/Password, Google, Facebook OAuth)
- 📱 Social Feed with infinite scroll and real-time updates
- 🖼️ Post creation with multiple images and videos
- 💬 Comments and interactions (like, share, quote)
- 👤 User profiles with follow system
- 🗺️ Interactive map with vegan places
- 💳 Stripe subscription management (Free, Medium, Premium tiers)
- 📍 Location-based search for vegan places
- 🔔 Real-time notifications
- 🎨 Beautiful UI matching web design

## Tech Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Real-time)
- **State Management:** Zustand
- **Navigation:** React Navigation (Expo Router)
- **Maps:** React Native Maps
- **Payments:** Stripe
- **Image Handling:** Expo Image Picker + Manipulator

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Studio
- Supabase account (already configured)
- Stripe account (for subscriptions)

## Installation

1. **Install dependencies:**
   ```bash
   cd mobileapp
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   - Supabase URL and Anon Key (from main project)
   - Stripe Publishable Key
   - Google Maps API Key (for Android)

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on your device:**
   - iOS: Press `i` or scan QR code with Expo Go app
   - Android: Press `a` or scan QR code with Expo Go app
   - Web: Press `w` (limited functionality)

## Project Structure

```
mobileapp/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── posts/        # Post-related components
│   │   ├── profile/      # Profile components
│   │   ├── map/          # Map components
│   │   └── ui/           # Generic UI components
│   ├── screens/          # Screen components
│   │   ├── AuthScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/       # Navigation configuration
│   ├── store/           # Zustand stores
│   │   ├── authStore.ts
│   │   ├── postStore.ts
│   │   └── userStore.ts
│   ├── lib/             # Libraries and utilities
│   │   ├── supabase.ts  # Supabase client
│   │   └── stripe.ts    # Stripe configuration
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── constants/       # App constants and theme
├── assets/              # Images, fonts, etc.
├── app/                 # Expo Router app directory
├── package.json
├── app.json            # Expo configuration
└── tsconfig.json       # TypeScript configuration
```

## Key Features Implementation

### Authentication
- Uses same Supabase Auth as web app
- Supports email/password and OAuth (Google, Facebook)
- Secure token storage with Expo SecureStore
- Auto session refresh

### Posts & Feed
- Infinite scroll with pagination
- Real-time updates via Supabase subscriptions
- Multiple sort options (relevancy, recent, most liked)
- Image compression before upload
- Video support
- Quote and share functionality

### Map
- React Native Maps with Apple Maps (iOS) / Google Maps (Android)
- Custom markers for vegan places
- Category filtering (restaurants, events, museums, etc.)
- Location-based search with radius
- Add new places functionality

### Subscriptions
- Three tiers: Free, Medium, Premium
- Stripe integration for payments
- Manage subscriptions in-app
- Feature gating based on tier
- Visual tier badges

### Real-time Features
- New posts notification
- Live like/comment counts
- Supabase real-time subscriptions

## Development Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test
```

## Building for Production

### iOS
1. Configure app.json with your bundle identifier
2. Build: `eas build --platform ios`
3. Submit to App Store: `eas submit --platform ios`

### Android
1. Configure app.json with your package name
2. Add Google Maps API key
3. Build: `eas build --platform android`
4. Submit to Play Store: `eas submit --platform android`

## Environment Variables

Required environment variables in `.env`:

```bash
# Supabase (same as web app)
EXPO_PUBLIC_SUPABASE_URL=https://mfeelaqjbtnypoojhfjp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Maps (Android)
GOOGLE_MAPS_API_KEY=your_api_key
```

## Supabase Configuration

The mobile app uses the **same Supabase project** as the web app:
- Same database tables and RLS policies
- Same storage buckets
- Same authentication providers
- All data is synchronized automatically

No additional backend setup required!

## Stripe Configuration

Uses the same Stripe account as web app:
- Same price IDs for subscriptions
- Subscription status synced via Supabase
- Customer portal accessible in-app

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues:**
   ```bash
   npx expo start -c
   ```

2. **Module resolution errors:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS build issues:**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Android build issues:**
   - Check Google Maps API key in app.json
   - Verify Android SDK is installed

### Platform-Specific Notes

**iOS:**
- Requires macOS for development
- Simulator included with Xcode
- App Store account needed for distribution

**Android:**
- Works on any OS
- Requires Android Studio for emulator
- Google Play account needed for distribution

## Performance Optimization

- Image compression before upload (WebP format, max 1200px)
- Lazy loading for feed
- Image caching with Expo Image
- Memoization for expensive computations
- Virtualized lists for performance

## Security

- Row Level Security (RLS) policies in Supabase
- Secure token storage
- HTTPS only
- Environment variables for sensitive data
- No secrets in client code

## Contributing

This is the mobile companion to the VeganConnect web app. Keep functionality in sync with web version.

## Support

For issues or questions:
1. Check web app documentation
2. Review Supabase configuration
3. Check Expo documentation
4. Review React Navigation docs

## License

Same as main VeganConnect project.
