#!/usr/bin/env tsx
/**
 * Parse the VegGuide.org MySQL dump and emit JSON for Vendor + Location tables.
 * Writes:
 *   data/vegguide/vendors.json
 *   data/vegguide/locations.json
 *
 * Vendor schema (relevant columns):
 *   vendor_id, name, short_description, long_description,
 *   address1, address2, neighborhood, city, region, postal_code,
 *   phone, home_page, veg_level, location_id, close_date,
 *   latitude, longitude
 *
 * veg_level meaning (per VegGuide):
 *   5 = Vegan (100%)
 *   4 = Vegetarian (has vegan options, no meat)
 *   3 = Veg-Friendly (some vegan options, serves meat)
 *   2 = Veggie-Friendly (some vegetarian options, serves meat)
 *   1 = Other
 */

import { readFileSync, writeFileSync } from 'fs'

const SQL_PATH = 'data/vegguide/RegVeg.sql'

// Vendor column order (from CREATE TABLE)
const VENDOR_COLS = [
  'vendor_id', 'name', 'localized_name', 'short_description', 'localized_short_description',
  'long_description', 'address1', 'localized_address1', 'address2', 'localized_address2',
  'neighborhood', 'localized_neighborhood', 'directions', 'city', 'localized_city',
  'region', 'localized_region', 'postal_code', 'phone', 'home_page', 'veg_level',
  'allows_smoking', 'is_wheelchair_accessible', 'accepts_reservations',
  'creation_datetime', 'last_modified_datetime', 'last_featured_date',
  'user_id', 'location_id', 'price_range_id', 'localized_long_description',
  'latitude', 'longitude', 'is_cash_only', 'close_date', 'canonical_address',
  'external_unique_id', 'vendor_source_id', 'sortable_name',
]

const LOCATION_COLS = [
  'location_id', 'name', 'localized_name', 'time_zone_name',
  'can_have_vendors', 'is_country', 'parent_location_id', 'locale_id',
  'creation_datetime', 'user_id', 'has_addresses', 'has_hours',
]

// Parse a MySQL string literal, returning [string, endPos].
// Pos points at the opening quote.
function readString(s: string, pos: number): [string, number] {
  const quote = s[pos]
  pos++
  let out = ''
  while (pos < s.length) {
    const c = s[pos]
    if (c === '\\') {
      const n = s[pos + 1]
      if (n === 'n') out += '\n'
      else if (n === 'r') out += '\r'
      else if (n === 't') out += '\t'
      else if (n === '0') out += '\0'
      else if (n === 'Z') out += '\x1a'
      else out += n
      pos += 2
    } else if (c === quote) {
      return [out, pos + 1]
    } else {
      out += c
      pos++
    }
  }
  throw new Error('unterminated string')
}

// Parse one value token: string, number, or NULL.
function readValue(s: string, pos: number): [any, number] {
  // skip whitespace
  while (pos < s.length && /\s/.test(s[pos])) pos++
  const c = s[pos]
  if (c === "'" || c === '"') return readString(s, pos)
  if (s.startsWith('NULL', pos)) return [null, pos + 4]
  // number or other literal
  let end = pos
  while (end < s.length && s[end] !== ',' && s[end] !== ')') end++
  const raw = s.slice(pos, end).trim()
  const n = Number(raw)
  return [Number.isFinite(n) ? n : raw, end]
}

// Parse `(v1, v2, ..., vN)` returning values array and pos after close paren.
function readTuple(s: string, pos: number): [any[], number] {
  if (s[pos] !== '(') throw new Error(`expected ( at ${pos}`)
  pos++
  const vals: any[] = []
  while (pos < s.length) {
    while (pos < s.length && /\s/.test(s[pos])) pos++
    if (s[pos] === ')') return [vals, pos + 1]
    const [v, p2] = readValue(s, pos)
    vals.push(v)
    pos = p2
    while (pos < s.length && /\s/.test(s[pos])) pos++
    if (s[pos] === ',') pos++
  }
  throw new Error('unterminated tuple')
}

function parseInsertStatement(stmt: string, columnCount: number): any[][] {
  // find "VALUES "
  const idx = stmt.indexOf('VALUES')
  if (idx < 0) return []
  let pos = idx + 6
  const out: any[][] = []
  while (pos < stmt.length) {
    while (pos < stmt.length && /\s/.test(stmt[pos])) pos++
    if (stmt[pos] === ';' || pos >= stmt.length) break
    if (stmt[pos] === ',') { pos++; continue }
    const [tuple, p2] = readTuple(stmt, pos)
    if (tuple.length !== columnCount) {
      console.warn(`skipping tuple with ${tuple.length} cols (expected ${columnCount})`)
    } else {
      out.push(tuple)
    }
    pos = p2
  }
  return out
}

function main() {
  console.log('Reading SQL dump...')
  const sql = readFileSync(SQL_PATH, 'utf-8')
  console.log(`Dump size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`)

  // Extract all INSERT statements for a given table.
  function extractInserts(table: string): string[] {
    const prefix = `INSERT INTO \`${table}\` VALUES `
    const stmts: string[] = []
    let pos = 0
    while (true) {
      const idx = sql.indexOf(prefix, pos)
      if (idx < 0) break
      // find terminating ";\n"
      const end = sql.indexOf(';\n', idx)
      if (end < 0) break
      stmts.push(sql.slice(idx, end))
      pos = end + 2
    }
    return stmts
  }

  console.log('Parsing Vendors...')
  const vendorInserts = extractInserts('Vendor')
  console.log(`  ${vendorInserts.length} INSERT statements`)
  const vendors: any[] = []
  for (const stmt of vendorInserts) {
    const rows = parseInsertStatement(stmt, VENDOR_COLS.length)
    for (const r of rows) {
      const obj: any = {}
      for (let i = 0; i < VENDOR_COLS.length; i++) obj[VENDOR_COLS[i]] = r[i]
      vendors.push(obj)
    }
  }
  console.log(`  ${vendors.length} vendors parsed`)

  console.log('Parsing Locations...')
  const locationInserts = extractInserts('Location')
  const locations: any[] = []
  for (const stmt of locationInserts) {
    const rows = parseInsertStatement(stmt, LOCATION_COLS.length)
    for (const r of rows) {
      const obj: any = {}
      for (let i = 0; i < LOCATION_COLS.length; i++) obj[LOCATION_COLS[i]] = r[i]
      locations.push(obj)
    }
  }
  console.log(`  ${locations.length} locations parsed`)

  writeFileSync('data/vegguide/vendors.json', JSON.stringify(vendors, null, 1))
  writeFileSync('data/vegguide/locations.json', JSON.stringify(locations, null, 1))

  // Summary stats
  const byVegLevel: Record<string, number> = {}
  let open = 0, closed = 0, geocoded = 0
  for (const v of vendors) {
    byVegLevel[v.veg_level] = (byVegLevel[v.veg_level] ?? 0) + 1
    if (v.close_date) closed++; else open++
    if (v.latitude && v.longitude) geocoded++
  }
  console.log('\nBy veg_level:', byVegLevel)
  console.log(`Open: ${open} | Closed: ${closed} | Geocoded: ${geocoded}`)
}

main()
