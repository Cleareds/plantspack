import { constants } from '@/src/constants/theme';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * Username should be 3-20 characters, alphanumeric and underscore only
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 * At least 8 characters, with uppercase, lowercase, and number
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate post content based on subscription tier
 */
export function validatePostContent(
  content: string,
  maxLength: number
): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Post content cannot be empty',
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Post content must be ${maxLength} characters or less`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validate comment content
 */
export function validateComment(content: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Comment cannot be empty',
    };
  }

  if (trimmed.length > constants.MAX_COMMENT_LENGTH) {
    return {
      isValid: false,
      error: `Comment must be ${constants.MAX_COMMENT_LENGTH} characters or less`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Sanitize username (remove special characters, lowercase)
 */
export function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

/**
 * Validate bio length
 */
export function validateBio(bio: string, maxLength: number = 500): {
  isValid: boolean;
  error?: string;
} {
  if (bio.length > maxLength) {
    return {
      isValid: false,
      error: `Bio must be ${maxLength} characters or less`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Check if string contains profanity (basic check)
 */
export function containsProfanity(text: string): boolean {
  // This is a very basic implementation
  // In production, use a proper profanity filter library
  const profanityList = ['spam', 'scam']; // Add more as needed
  const lowerText = text.toLowerCase();

  return profanityList.some(word => lowerText.includes(word));
}

/**
 * Validate latitude
 */
export function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude
 */
export function validateLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}
