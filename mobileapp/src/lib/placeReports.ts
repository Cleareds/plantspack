// Community verification / reporting — posts to the same endpoint the website
// uses. "confirmed" marks the place community-verified; other types flag it for
// admin review.
// Canonical host: plantspack.com 301-redirects to www, and a 301 downgrades
// POST → GET, which silently breaks these report writes. Hit www directly.
const API_BASE = 'https://www.plantspack.com';

export type ReportType =
  | 'confirmed'
  | 'permanently_closed'
  | 'hours_wrong'
  | 'not_fully_vegan'
  | 'actually_fully_vegan';

export async function reportPlace(placeId: string, type: ReportType): Promise<void> {
  const res = await fetch(`${API_BASE}/api/places/${placeId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? 'Could not submit. Please try again.');
  }
}
