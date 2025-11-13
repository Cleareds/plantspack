import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/src/types/database';

// Environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Custom storage implementation using SecureStore for tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Use SecureStore for auth tokens (more secure)
      if (key.includes('auth-token')) {
        return await SecureStore.getItemAsync(key);
      }
      // Use AsyncStorage for other data
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Use SecureStore for auth tokens
      if (key.includes('auth-token')) {
        await SecureStore.setItemAsync(key, value);
      } else {
        // Use AsyncStorage for other data
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      // Use SecureStore for auth tokens
      if (key.includes('auth-token')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        // Use AsyncStorage for other data
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

// Create Supabase client (same configuration as web app)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions

/**
 * Upload image to Supabase Storage
 * @param userId User ID for folder organization
 * @param file File URI from image picker
 * @param bucket Storage bucket name (default: 'post-images')
 * @returns Public URL of uploaded image
 */
export async function uploadImage(
  userId: string,
  file: {
    uri: string;
    type?: string;
    name?: string;
  },
  bucket: string = 'post-images'
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = file.name?.split('.').pop() || 'webp';
    const fileName = `${userId}/${timestamp}-${random}.${extension}`;

    // Read file as blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: file.type || 'image/webp',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Upload video to Supabase Storage
 * @param userId User ID for folder organization
 * @param file File URI from video picker
 * @param bucket Storage bucket name (default: 'post-videos')
 * @returns Public URL of uploaded video
 */
export async function uploadVideo(
  userId: string,
  file: {
    uri: string;
    type?: string;
    name?: string;
  },
  bucket: string = 'post-videos'
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = file.name?.split('.').pop() || 'mp4';
    const fileName = `${userId}/${timestamp}-${random}.${extension}`;

    // Read file as blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * @param fileUrl Public URL of the file
 * @param bucket Storage bucket name
 */
export async function deleteFile(
  fileUrl: string,
  bucket: string = 'post-images'
): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL');
    }
    const filePath = urlParts[1];

    // Delete from storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get current user profile from users table
 */
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Error checking username:', error);
    return false;
  }

  return !data;
}

/**
 * Get tier limits for subscription tier
 */
export function getTierLimits(tier: Database['public']['Tables']['users']['Row']['subscription_tier']) {
  const limits = {
    free: {
      maxPostLength: 250,
      maxImages: 1,
      maxVideos: 0,
      hasLocationFeatures: false,
      hasAnalytics: false,
    },
    medium: {
      maxPostLength: 1000,
      maxImages: 3,
      maxVideos: 1,
      hasLocationFeatures: true,
      hasAnalytics: true,
    },
    premium: {
      maxPostLength: 1000,
      maxImages: 5,
      maxVideos: 2,
      hasLocationFeatures: true,
      hasAnalytics: true,
    },
  };

  return limits[tier];
}

// Export types
export type { Database };
