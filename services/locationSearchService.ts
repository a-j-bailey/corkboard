/**
 * Location search service using Nominatim (OpenStreetMap).
 * Fetches suggestions for both addresses and places (POIs) and optionally
 * sorts them by distance from the user.
 */

import type {
  LocationSuggestion,
  OpenStreetMapResult,
} from '@julekgwa/react-native-places-autocomplete';
import { calculateDistance } from '../utils/distanceCalculator';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  place_id?: number | string;
  osm_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  importance?: number;
  [k: string]: unknown;
}

function mapToLocationSuggestion(
  item: NominatimResult
): LocationSuggestion<OpenStreetMapResult> {
  return {
    place_id:
      item.place_id?.toString() ??
      item.osm_id?.toString() ??
      Math.random().toString(),
    display_name: item.display_name || item.name || 'Unknown location',
    lat: item.lat || '0',
    lon: item.lon || '0',
    type: item.type || item.class || 'unknown',
    importance: item.importance ?? 0.5,
    raw: item as OpenStreetMapResult,
  };
}

export interface UserCoords {
  latitude: number;
  longitude: number;
}

/** Approx. degrees for viewbox radius (~25 miles at mid-latitudes). Nominatim uses this to boost results in the area. */
const VIEWBOX_DEGREES = 0.35;

/**
 * Builds a viewbox string for Nominatim: "minLon,minLat,maxLon,maxLat".
 * x = longitude, y = latitude per Nominatim docs.
 */
function viewboxFromCenter(lat: number, lon: number): string {
  const minLon = lon - VIEWBOX_DEGREES;
  const maxLon = lon + VIEWBOX_DEGREES;
  const minLat = lat - VIEWBOX_DEGREES;
  const maxLat = lat + VIEWBOX_DEGREES;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Fetches location suggestions from Nominatim and optionally sorts them
 * by distance from the user's current location (nearest first).
 * When userLocation is provided, also sends a viewbox boost so Nominatim
 * prefers results in that area (see https://nominatim.org/release-docs/develop/api/Search/).
 */
export async function fetchLocationSuggestions(
  query: string,
  userLocation: UserCoords | null | undefined,
  limit = 10
): Promise<LocationSuggestion<OpenStreetMapResult>[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    // Include both addresses and places (POIs: venues, landmarks, etc.)
    layer: 'address,poi',
  });

  if (userLocation) {
    params.set('viewbox', viewboxFromCenter(userLocation.latitude, userLocation.longitude));
  }

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status}`);
  }

  const data = (await res.json()) as NominatimResult[];
  const suggestions = (data ?? []).map(mapToLocationSuggestion);

  if (userLocation && suggestions.length > 1) {
    suggestions.sort((a, b) => {
      const latA = typeof a.lat === 'string' ? parseFloat(a.lat) : a.lat;
      const lonA = typeof a.lon === 'string' ? parseFloat(a.lon) : a.lon;
      const latB = typeof b.lat === 'string' ? parseFloat(b.lat) : b.lat;
      const lonB = typeof b.lon === 'string' ? parseFloat(b.lon) : b.lon;
      if (isNaN(latA) || isNaN(lonA)) return 1;
      if (isNaN(latB) || isNaN(lonB)) return -1;
      const distA = calculateDistance(userLocation, { latitude: latA, longitude: lonA });
      const distB = calculateDistance(userLocation, { latitude: latB, longitude: lonB });
      return distA - distB;
    });
  }

  return suggestions;
}
