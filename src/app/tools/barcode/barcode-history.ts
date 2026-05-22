// Client-side barcode scan history in IndexedDB. Keeps the most recent
// scans on the device so users can revisit what they've checked without
// needing a server round-trip - works for guests too.

const DB_NAME = 'plantspack-tools'
const STORE = 'barcode-history'
const DB_VERSION = 1
const MAX_ENTRIES = 200

export interface BarcodeHistoryEntry {
  barcode: string
  verdict: string
  productName: string | null
  brand: string | null
  imageUrl: string | null
  allergenHits: string[]
  ts: number // epoch ms
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'barcode' })
        store.createIndex('ts', 'ts')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveBarcodeScan(entry: BarcodeHistoryEntry): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    // Trim if oversized.
    const count = await new Promise<number>((resolve) => {
      const c = db.transaction(STORE, 'readonly').objectStore(STORE).count()
      c.onsuccess = () => resolve(c.result)
      c.onerror = () => resolve(0)
    })
    if (count > MAX_ENTRIES) {
      const all = await getRecentBarcodeScans(MAX_ENTRIES + 50)
      const toDelete = all.slice(MAX_ENTRIES).map((e) => e.barcode)
      const tx2 = db.transaction(STORE, 'readwrite')
      for (const code of toDelete) tx2.objectStore(STORE).delete(code)
    }
  } catch (e) {
    console.warn('[barcode-history] save failed', e)
  }
}

export async function getRecentBarcodeScans(limit = 50): Promise<BarcodeHistoryEntry[]> {
  if (typeof indexedDB === 'undefined') return []
  try {
    const db = await openDb()
    return await new Promise<BarcodeHistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const idx = tx.objectStore(STORE).index('ts')
      const cursor = idx.openCursor(null, 'prev')
      const out: BarcodeHistoryEntry[] = []
      cursor.onsuccess = () => {
        const c = cursor.result
        if (!c || out.length >= limit) return resolve(out)
        out.push(c.value as BarcodeHistoryEntry)
        c.continue()
      }
      cursor.onerror = () => reject(cursor.error)
    })
  } catch {
    return []
  }
}

export async function clearBarcodeHistory(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch {
    /* ignore */
  }
}
