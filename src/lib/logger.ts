/**
 * Server-side logger that drops debug/info in production by default.
 *
 * Vercel charges per Observability Event (each console.* line on a serverless
 * function counts). At ~5.4M function invocations / month the bill of 16.2M
 * events confirmed an average of ~3 events per invocation — almost all
 * coming from happy-path console.log calls that exist only for local
 * debugging.
 *
 * Use:
 *   import { log } from '@/lib/logger'
 *   log.debug('something happened', { detail })   // dropped in prod
 *   log.info('non-critical fact')                  // dropped in prod
 *   log.warn('something is off but not broken')   // kept always
 *   log.error('something failed', err)            // kept always
 *
 * Override at runtime by setting LOG_LEVEL=debug|info|warn|error in env.
 * Default in production: 'warn' (drops debug + info).
 * Default in development: 'debug' (everything).
 *
 * Plain `console.error` / `console.warn` are kept across the codebase
 * because they identify real problems and need to reach Vercel anyway.
 * This module is for replacing the much louder `console.log` calls on
 * happy paths.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function resolveLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? '').toLowerCase()
  if (raw in ORDER) return ORDER[raw as Level]
  return process.env.NODE_ENV === 'production' ? ORDER.warn : ORDER.debug
}

const threshold = resolveLevel()

function emit(level: Level, args: unknown[]): void {
  if (ORDER[level] < threshold) return
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(...args)
}

export const log = {
  debug: (...args: unknown[]) => emit('debug', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
}
