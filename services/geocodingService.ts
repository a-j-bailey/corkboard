/**
 * Geocoding service for converting location strings to coordinates
 * Uses Expo Location geocodeAsync
 */

import * as Location from 'expo-location';

export interface GeocodedLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Simple cache to avoid redundant API calls
const geocodingCache = new Map<string, GeocodedLocation | null>();
let permissionStatus: Location.PermissionStatus | null = null;

/**
 * Requests location permissions if not already granted
 */
async function ensureLocationPermissions(): Promise<boolean> {
  // Check if we've already checked permissions
  if (permissionStatus === null) {
    const { status } = await Location.getForegroundPermissionsAsync();
    permissionStatus = status;
  }

  // If already granted, return true
  if (permissionStatus === Location.PermissionStatus.GRANTED) {
    return true;
  }

  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  permissionStatus = status;

  if (status !== Location.PermissionStatus.GRANTED) {
    console.warn('[GeocodingService] Location permission not granted');
    return false;
  }

  return true;
}

/**
 * Geocodes a location string to coordinates using Expo Location
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
    // Ensure we have location permissions
    // Note: On Android, location permissions are required for geocoding
    // On iOS, geocoding may work without permissions but it's better to request them
    const hasPermission = await ensureLocationPermissions();
    
    if (!hasPermission) {
      console.warn('[GeocodingService] Cannot geocode without location permissions');
      // Cache null result to avoid retrying
      geocodingCache.set(trimmedLocation, null);
      return null;
    }

    // Use Expo Location geocodeAsync to convert address to coordinates
    const geocodedResults = await Location.geocodeAsync(trimmedLocation);

    if (!geocodedResults || geocodedResults.length === 0) {
      console.warn('[GeocodingService] No geocoding results found for:', trimmedLocation);
      // Cache null result to avoid retrying failed lookups
      geocodingCache.set(trimmedLocation, null);
      return null;
    }

    // Use the first result (most relevant)
    const firstResult = geocodedResults[0];
    
    const result: GeocodedLocation = {
      name: trimmedLocation, // Use the input as the name
      address: trimmedLocation, // Use the input as the address
      latitude: firstResult.latitude,
      longitude: firstResult.longitude,
    };

    // Cache the result
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

