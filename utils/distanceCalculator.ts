/**
 * Distance calculation utilities using the Haversine formula
 * Calculates the great-circle distance between two points on Earth
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Earth's radius in miles
 */
const EARTH_RADIUS_MILES = 3959;

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate (latitude, longitude)
 * @param coord2 Second coordinate (latitude, longitude)
 * @returns Distance in miles
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  // Convert degrees to radians
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;

  return distance;
}

/**
 * Checks if a coordinate is within a specified distance from a reference point
 * @param reference Reference coordinate (user's location)
 * @param target Target coordinate (event location)
 * @param maxDistance Maximum distance in miles
 * @returns True if target is within maxDistance of reference
 */
export function isWithinDistance(
  reference: Coordinates,
  target: Coordinates,
  maxDistance: number
): boolean {
  const distance = calculateDistance(reference, target);
  return distance <= maxDistance;
}
