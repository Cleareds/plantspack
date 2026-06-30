/**
 * Cross-platform place-name geocoding via Nominatim (OpenStreetMap).
 *
 * We deliberately do NOT use expo-location's `geocodeAsync`: on Android it
 * relies on the native `android.location.Geocoder`, which requires a Google
 * geocoding backend and returns an empty list (or throws) on most devices,
 * including internal-tester builds and emulators. Nominatim works identically
 * on iOS and Android and needs no API key — the same service the web app uses.
 *
 * Complies with Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PlantsPack-Mobile/1.0 (https://www.plantspack.com)';

export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    format: 'json',
    q,
    limit: '5',
    addressdetails: '0',
    dedupe: '1',
    'accept-language': 'en',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    return data
      .map((r) => ({
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        displayName: r.display_name,
      }))
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export interface ReverseCity {
  city: string;
  country: string;
}

const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

// Resolve GPS coordinates to a structured { city, country } (English), for
// "pin my city". Returns null if it can't determine a city-level name.
export async function reverseGeocodeCity(lat: number, lng: number): Promise<ReverseCity | null> {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lng),
    zoom: '10', // city level
    addressdetails: '1',
    'accept-language': 'en',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${REVERSE_ENDPOINT}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'en' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state || '';
    const country = a.country || '';
    if (!city || !country) return null;
    return { city, country };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
