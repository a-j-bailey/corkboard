/**
 * Resolves a free-text location from poster extraction into coordinates
 * and display labels: platform geocoder first, then Nominatim (first result).
 */

import { ExtractionStepMessage } from './extractionMessages';
import { geocodeLocation } from './geocodingService';
import { fetchLocationSuggestions } from './locationSearchService';
import type { UserCoords } from './locationSearchService';

export interface ResolvedExtractedLocation {
  address: string;
  locationName: string;
  latitude: number;
  longitude: number;
}

function toUserCoords(
  userLocation: { latitude: number; longitude: number } | null | undefined
): UserCoords | null | undefined {
  if (!userLocation) return undefined;
  return { latitude: userLocation.latitude, longitude: userLocation.longitude };
}

export interface ResolveExtractedLocationOptions {
  userLocation?: { latitude: number; longitude: number } | null;
  onProgress?: (message: string) => void;
}

/**
 * Tries Expo geocode, then Nominatim search (limit 1). Returns null if neither yields coordinates.
 */
export async function resolveExtractedLocationString(
  raw: string,
  options?: ResolveExtractedLocationOptions
): Promise<ResolvedExtractedLocation | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const onProgress = options?.onProgress;
  const userLocation = options?.userLocation;

  onProgress?.(ExtractionStepMessage.identifyingLocation);

  const geocoded = await geocodeLocation(trimmed);
  if (geocoded) {
    return {
      address: trimmed,
      locationName: trimmed,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    };
  }

  onProgress?.(ExtractionStepMessage.lookingUpLocation);

  try {
    const suggestions = await fetchLocationSuggestions(trimmed, toUserCoords(userLocation), 1);
    const first = suggestions[0];
    if (!first) return null;

    const lat =
      typeof first.lat === 'string' ? parseFloat(first.lat) : first.lat;
    const lon =
      typeof first.lon === 'string' ? parseFloat(first.lon) : first.lon;
    if (isNaN(lat) || isNaN(lon)) return null;

    const label = first.display_name?.trim() || trimmed;
    return {
      address: label,
      locationName: label,
      latitude: lat,
      longitude: lon,
    };
  } catch (e) {
    console.warn('[resolveExtractedLocation] Nominatim fallback failed:', e);
    return null;
  }
}
