import { create } from 'zustand';
import { supabase, getCurrentUserProfile } from '@/src/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/src/types/database';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: { username: string; first_name?: string; last_name?: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const profile = await getCurrentUserProfile();
        set({
          user: session.user,
          session,
          profile,
          loading: false,
          initialized: true,
        });
      } else {
        set({ loading: false, initialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const profile = await getCurrentUserProfile();
          set({
            user: session.user,
            session,
            profile,
            loading: false,
          });
        } else {
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
          });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false, initialized: true });
    }
  },

  signIn: async (identifier: string, password: string) => {
    try {
      set({ loading: true });

      // Check if identifier is email or username
      const isEmail = identifier.includes('@');

      let email = identifier;

      // If username, fetch email first
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier)
          .single();

        if (userError || !userData) {
          throw new Error('Invalid username or password');
        }

        email = userData.email;
      }

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch profile
      const profile = await getCurrentUserProfile();

      set({
        user: data.user,
        session: data.session,
        profile,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, userData) => {
    try {
      set({ loading: true });

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to create user');

      // Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          username: userData.username,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          subscription_tier: 'free',
        });

      if (profileError) throw profileError;

      // Fetch the created profile
      const profile = await getCurrentUserProfile();

      set({
        user: data.user,
        session: data.session,
        profile,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true });

      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'veganconnect',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const { url } = result;
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            const profile = await getCurrentUserProfile();

            const { data: { session } } = await supabase.auth.getSession();

            set({
              user: session?.user || null,
              session,
              profile,
              loading: false,
            });
          }
        } else {
          set({ loading: false });
        }
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      set({ loading: false });
      throw error;
    }
  },

  signInWithFacebook: async () => {
    try {
      set({ loading: true });

      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'veganconnect',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const { url } = result;
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            const profile = await getCurrentUserProfile();

            const { data: { session } } = await supabase.auth.getSession();

            set({
              user: session?.user || null,
              session,
              profile,
              loading: false,
            });
          }
        } else {
          set({ loading: false });
        }
      }
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await getCurrentUserProfile();
      set({ profile });
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  },

  updateProfile: async (updates) => {
    try {
      const { profile } = get();
      if (!profile) throw new Error('No profile to update');

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
}));
