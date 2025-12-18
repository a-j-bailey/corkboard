/**
 * Geocoding service for converting location strings to coordinates
 * Uses Apple Maps Geocoding API
 */

export interface GeocodedLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Simple cache to avoid redundant API calls
const geocodingCache = new Map<string, GeocodedLocation | null>();

/**
 * Geocodes a location string to coordinates using Apple Maps
 * Falls back to storing raw address if geocoding fails
 */
export async function geocodeLocation(
  locationString: string
): Promise<GeocodedLocation | null> {
  if (!locationString || locationString.trim().length === 0) {
    return null;
  }

  const trimmedLocation = locationString.trim();

  // Check cache first
  if (geocodingCache.has(trimmedLocation)) {
    return geocodingCache.get(trimmedLocation) || null;
  }

  try {
    // Use Apple Maps Geocoding API
    // Note: On iOS, we can use native geocoding, but for cross-platform
    // we'll use a geocoding service. For now, we'll use a simple approach
    // that can be enhanced with actual API integration later.
    
    // For now, we'll use a placeholder that returns null
    // This allows the app to work while geocoding can be implemented
    // with actual Apple Maps API key or alternative service
    
    // TODO: Implement actual geocoding with Apple Maps API
    // For now, return null to allow events to be saved without coordinates
    const result: GeocodedLocation | null = null;

    // Cache the result (even if null)
    geocodingCache.set(trimmedLocation, result);
    return result;
  } catch (error) {
    console.error('[GeocodingService] Error geocoding location:', error);
    // Cache null result to avoid retrying failed lookups
    geocodingCache.set(trimmedLocation, null);
    return null;
  }
}

/**
 * Clears the geocoding cache
 */
export function clearGeocodingCache(): void {
  geocodingCache.clear();
}

