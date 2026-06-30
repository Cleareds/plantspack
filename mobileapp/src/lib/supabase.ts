import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase sessions (access + refresh token + user object) routinely exceed
// expo-secure-store's 2048-byte limit, which silently fails to persist and logs
// the user out on every restart. AsyncStorage has no size cap and is the
// storage adapter in Supabase's official Expo guide. The value lives in the
// app's private sandbox.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
