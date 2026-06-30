// Shared client for the server-side AI scanner used by the menu + ingredient
// tools. The plantspack.com API holds the Claude/OpenAI key, so the app just
// POSTs images (as data URLs) or text and renders the structured result.
import { supabase } from './supabase';
import { getDeviceId } from './analytics';

// Use www directly: plantspack.com 301-redirects to www, downgrading POST → GET.
const API_BASE = 'https://www.plantspack.com';

export type Verdict = 'vegan' | 'not_vegan' | 'uncertain' | 'unclear' | 'invalid_image';

export interface ScanItem {
  name: string;
  status: 'vegan' | 'not_vegan' | 'uncertain';
  note?: string;
}

export interface ScanResult {
  verdict: Verdict;
  summary?: string;
  visibility?: { fully_readable: boolean; issues?: string };
  items?: ScanItem[];
  eCodeHits?: { code: string; name: string; status: string; note: string; allergen?: string }[];
}

export function toDataUrl(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

export async function scan(opts: {
  tool: 'ingredient' | 'menu';
  imageDataUrls?: string[];
  text?: string;
}): Promise<ScanResult> {
  // Send identity so the server quota works on mobile (no cookies):
  // Bearer token = signed-in user (3/month), x-guest-id = stable device id (1/month guest).
  const [{ data: sess }, deviceId] = await Promise.all([supabase.auth.getSession(), getDeviceId()]);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-guest-id': deviceId };
  if (sess.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;

  const res = await fetch(`${API_BASE}/api/tools/scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify(opts),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(json.error ?? "You've used your free scans. Sign in or upgrade for more.");
    }
    throw new Error(json.error ?? 'Scan failed. Please try again.');
  }
  return json.result as ScanResult;
}
