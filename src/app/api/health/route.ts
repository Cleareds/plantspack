import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Health check endpoint for uptime monitoring
 * Returns 200 if application and database are healthy
 * Returns 503 if there are issues
 */
export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connectivity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Simple query to verify database connection
    const { error: dbError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    // PGRST116 is "no rows returned" which is acceptable for health check
    if (dbError && dbError.code !== 'PGRST116') {
      throw new Error(`Database error: ${dbError.message}`)
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        responseTime: `${responseTime}ms`
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production'
    })
  } catch (error) {
    console.error('[Health Check] Error:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {
          database: 'failed'
        }
      },
      { status: 503 }
    )
  }
}
