# PlantsPack Mobile App

React Native mobile application for PlantsPack - the plant-based social network.

## 🚀 Tech Stack

- **Framework**: Expo SDK 52 + React Native 0.76
- **Routing**: Expo Router 4.0 (file-based routing)
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Maps**: React Native Maps (Google Maps)
- **Authentication**: Supabase Auth (Email, Google, Facebook OAuth)
- **Language**: TypeScript

## 📱 Quick Start

```bash
# Install dependencies (already done)
npm install

# Start development server
npm start

# Scan QR code with Expo Go app
```

### Install Expo Go
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## ✅ Features Implemented

- ✅ **Authentication** (Email, Google, Facebook OAuth)
- ✅ **Feed/Posts** (Create, like, comment, delete with images)
- ✅ **Profile** (Stats, posts, followers/following)
- ✅ **Places** (Interactive map, category filters, favorites, directions)
- ✅ **Packs** (Browse by category, join/leave, view posts)
- ✅ **Settings** (Account info, subscription tier, logout)

## 🔧 Environment Variables

Already configured in `.env`:
- Supabase URL and keys
- Stripe publishable key
- Google Maps API key
- API base URL (plantspack.com)

## 📦 Scripts

```bash
npm start        # Start Expo dev server
npm run ios      # Run on iOS simulator (Mac only)
npm run android  # Run on Android emulator
npm run web      # Run in web browser
```

## 🐛 Troubleshooting

### Clear cache and restart
```bash
npx expo start -c
```

### Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### SDK version mismatch
Already upgraded to SDK 52 - compatible with latest Expo Go!

## 📂 Project Structure

```
mobileapp/
├── app/                    # File-based routing
│   ├── (tabs)/            # Tab navigation
│   ├── auth/              # Auth screens
│   ├── place/[id].tsx     # Place details
│   └── pack/[id].tsx      # Pack details
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── store/            # Zustand stores
│   ├── lib/              # Supabase client
│   ├── types/            # TypeScript types
│   └── constants/        # Theme & config
└── assets/               # Images & fonts
```

## 🌐 API Integration

Base URL: `https://plantspack.com/api`
- `/api/posts` - Feed management
- `/api/places` - Places discovery
- `/api/packs` - Community packs
- `/api/users` - User profiles

## ⚡ Current Version

- **Expo SDK**: 52.0.0
- **React Native**: 0.76.9
- **Expo Router**: 4.0.22

---

**License**: Proprietary - PlantsPack 2024
