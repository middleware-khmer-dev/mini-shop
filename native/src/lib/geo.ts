/** Phnom Penh, the default map centre. */
export const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 };

export type Place = { lat: number; lng: number };

const NOMINATIM = "https://nominatim.openstreetmap.org";

/** Street address for a point (OpenStreetMap Nominatim; light use only, so callers debounce). */
export async function reverseGeocode(p: Place, lang: string): Promise<string | null> {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${p.lat}&lon=${p.lng}&accept-language=${lang}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export type SearchHit = Place & { label: string };

/** Find a place by name, limited to Cambodia. */
export async function searchPlace(q: string, lang: string): Promise<SearchHit[]> {
  try {
    const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=kh&q=${encodeURIComponent(q)}&accept-language=${lang}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), label: d.display_name }));
  } catch {
    return [];
  }
}
