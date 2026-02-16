# PlantsPack Mobile App

React Native mobile application for PlantsPack - the plant-based social network.

## 🚀 Latest Version

- **Expo SDK**: 54.0.0 ✨
- **React**: 19.1.0
- **React Native**: 0.81.5
- **expo-router**: 6.0.23

## 📱 Quick Start

```bash
# Start development server
npm start

# Scan QR code with Expo Go app on your phone
```

### Install Expo Go
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

**✅ Now fully compatible with Expo Go SDK 54!**

## ✅ Features

- **Authentication** (Email, Google, Facebook OAuth)
- **Feed/Posts** (Create, like, comment, delete with images)
- **Profile** (Stats, posts, followers/following)
- **Places** (Interactive map, category filters, favorites, directions)
- **Packs** (Browse by category, join/leave, view posts)
- **Settings** (Account info, subscription tier, logout)

## 🛠️ Tech Stack

- Expo SDK 54 + React Native 0.81
- Expo Router 6.0 (file-based routing)
- Zustand (state management)
- Supabase (database & auth)
- React Native Maps
- Stripe payments

## 📦 Commands

```bash
npm start        # Start Expo dev server
npm run ios      # Run on iOS simulator
npm run android  # Run on Android emulator
```

## 🔒 Security

✅ **0 vulnerabilities** - All security issues resolved in SDK 54

## 📂 Project Structure

```
mobileapp/
├── app/                    # File-based routing
│   ├── (tabs)/            # Tab navigation
│   ├── place/[id].tsx     # Place details
│   └── pack/[id].tsx      # Pack details
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── store/            # Zustand stores
│   └── lib/              # Supabase client
└── assets/               # Images & fonts
```

## 🐛 Troubleshooting

Clear cache:
```bash
npx expo start -c
```

Reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**License**: Proprietary - PlantsPack 2024
