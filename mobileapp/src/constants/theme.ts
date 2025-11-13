import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Colors matching the web app
export const colors = {
  // Primary (Green - vegan theme)
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main primary
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Secondary (Gray)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Tier colors
  tier: {
    free: '#6B7280',
    medium: '#059669',
    premium: '#7C3AED',
  },

  // Functional colors
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',

  // Social colors
  like: '#ef4444',
  comment: '#3b82f6',
  share: '#10b981',

  // Text
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },

  // Background
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },

  // Border
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
};

// Typography
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing (same as Tailwind)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
  },
};

// Layout
export const layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 768,
  isLargeDevice: width >= 768,
};

// Animation timings
export const animation = {
  fast: 150,
  base: 250,
  slow: 350,
};

// Subscription tier limits (matching web app)
export const tierLimits = {
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

// App constants
export const constants = {
  POSTS_PER_PAGE: 10,
  COMMENTS_PER_PAGE: 20,
  MAX_COMMENT_LENGTH: 280,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TOTAL_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  IMAGE_COMPRESSION_QUALITY: 0.85,
  IMAGE_MAX_WIDTH: 1200,
  MAP_SEARCH_RADIUS: [5, 10, 25, 50, 100, 200], // km
  MAP_DEFAULT_RADIUS: 25,
  DEBOUNCE_DELAY: 300,
};
