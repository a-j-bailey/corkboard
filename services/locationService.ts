/**
 * Location service for getting user's current location
 * Uses Expo Location getCurrentPositionAsync
 */

import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Cache location for 5 minutes to reduce battery usage
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedLocation {
  location: UserLocation;
  timestamp: number;
}

let cachedLocation: CachedLocation | null = null;
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
    console.warn('[LocationService] Location permission not granted');
    return false;
  }

  return true;
}

/**
 * Gets the user's current location
 * Caches the location for 5 minutes to reduce battery usage
 * @returns UserLocation if available, null otherwise
 */
export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    // Check cache first
    if (cachedLocation) {
      const now = Date.now();
      const age = now - cachedLocation.timestamp;
      
      if (age < LOCATION_CACHE_DURATION) {
        console.log('[LocationService] Using cached location');
        return cachedLocation.location;
      } else {
        // Cache expired, clear it
        cachedLocation = null;
      }
    }

    // Ensure we have location permissions
    const hasPermission = await ensureLocationPermissions();
    
    if (!hasPermission) {
      console.warn('[LocationService] Cannot get location without permissions');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Balanced accuracy for better battery life
    });

    const userLocation: UserLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Cache the location
    cachedLocation = {
      location: userLocation,
      timestamp: Date.now(),
    };

    console.log('[LocationService] Got current location:', userLocation);
    return userLocation;
  } catch (error) {
    console.error('[LocationService] Error getting current location:', error);
    return null;
  }
}

/**
 * Clears the cached location
 */
export function clearLocationCache(): void {
  cachedLocation = null;
}

/**
 * Checks if location permissions are granted
 */
export async function hasLocationPermission(): Promise<boolean> {
  if (permissionStatus === null) {
    const { status } = await Location.getForegroundPermissionsAsync();
    permissionStatus = status;
  }
  return permissionStatus === Location.PermissionStatus.GRANTED;
}
