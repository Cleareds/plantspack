// Shared renderer for place_corrections values, used by both
// /admin/data-quality and /admin/corrections. The corrections column is
// JSONB, so a field's value can be a string, number, boolean, array, or
// nested object - rendering with String() gives "[object Object]" for
// anything non-primitive. This helper handles all those cases.

import { JSX } from 'react'

export function formatCorrectionValue(val: unknown): JSX.Element {
  if (val === null || val === undefined) {
    return <span className="text-gray-500 italic">none</span>
  }
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return <span>{String(val)}</span>
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-gray-500 italic">empty list</span>
    // Array of primitives → comma-separated. Array of objects → bullet list.
    const allPrim = val.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
    if (allPrim) {
      return <span>{val.map(v => String(v)).join(', ')}</span>
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {val.map((v, i) => (
          <li key={i} className="text-sm">{formatCorrectionValue(v)}</li>
        ))}
      </ul>
    )
  }
  if (typeof val === 'object') {
    // Render object as key: value pairs. Detect common shapes first.
    const obj = val as Record<string, unknown>

    // Common "evidence" shapes from CLI audit scripts. Surface meaningful
    // labels rather than dumping JSON.
    if (typeof obj.source === 'string' && (typeof obj.note === 'string' || typeof obj.url === 'string')) {
      return (
        <span>
          <span className="text-xs text-gray-400">{obj.source}:</span>{' '}
          {typeof obj.url === 'string' ? <a href={obj.url} target="_blank" rel="noreferrer" className="underline">{obj.url}</a> : null}
          {typeof obj.note === 'string' ? <span>{obj.note}</span> : null}
        </span>
      )
    }

    const keys = Object.keys(obj)
    if (keys.length === 0) return <span className="text-gray-500 italic">{'{}'}</span>
    return (
      <div className="space-y-0.5">
        {keys.map(k => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-gray-400">{k}:</span>
            <span className="flex-1 min-w-0 break-words">{formatCorrectionValue(obj[k])}</span>
          </div>
        ))}
      </div>
    )
  }
  return <span>{String(val)}</span>
}
