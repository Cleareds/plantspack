import { AuthError } from '@supabase/supabase-js'

export interface AuthResponse {
  data: any
  error: AuthError | Error | null
}

export interface AuthErrorResponse {
  error: AuthError | Error | null
}