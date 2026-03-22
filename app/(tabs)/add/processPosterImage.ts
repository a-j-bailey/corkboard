import Constants from 'expo-constants';
import { Router } from 'expo-router';
import { Alert } from 'react-native';
import type { Event } from '../../../contexts/EventContext';
import { ExtractionStepMessage } from '../../../services/extractionMessages';
import { resolveExtractedLocationString } from '../../../services/resolveExtractedLocation';
import type { UserLocation } from '../../../services/locationService';
import { extractEventFromImage } from '../../../services/visionExtraction';

function hasExtractedEvent(eventData: Partial<Event>): boolean {
  const title = eventData.title?.trim();
  if (!title) return false;
  return Array.isArray(eventData.dates) && eventData.dates.length > 0;
}

/**
 * Processes a poster image URI: extracts event data via vision, then navigates to preview.
 * Callers should set loading state before calling and pass onComplete to clear it.
 */
export async function processPosterImage(
  imageUri: string,
  router: Router,
  options?: {
    onComplete?: () => void;
    userLocation?: UserLocation | null;
    /** Shown under the spinner while extraction and location resolution run. */
    onProgress?: (message: string) => void;
  }
): Promise<void> {
  const onComplete = options?.onComplete;

  try {
    const xaiApiKey =
      Constants.expoConfig?.extra?.xaiApiKey ||
      process.env.EXPO_PUBLIC_XAI_API_KEY ||
      // Fallback to deprecated OpenAI env var for backward compatibility
      process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!xaiApiKey) {
      console.error('[processPosterImage] No xAI API key found');
      Alert.alert(
        'API Key Required',
        'xAI API key is required. Please set EXPO_PUBLIC_XAI_API_KEY in your environment or add xaiApiKey to app.json extra config.'
      );
      onComplete?.();
      return;
    }

    const onProgress = options?.onProgress;
    onProgress?.(ExtractionStepMessage.extracting);

    let eventData: Partial<Event> = await extractEventFromImage(imageUri, xaiApiKey);

    const rawAddress = eventData.address?.trim();
    if (rawAddress) {
      const resolved = await resolveExtractedLocationString(rawAddress, {
        userLocation: options?.userLocation,
        onProgress,
      });
      if (resolved) {
        eventData = {
          ...eventData,
          address: resolved.address,
          locationName: resolved.locationName,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
        };
      } else {
        delete eventData.address;
        delete eventData.locationName;
        delete eventData.latitude;
        delete eventData.longitude;
      }
    }

    if (!hasExtractedEvent(eventData)) {
      onComplete?.();
      Alert.alert(
        'No event found',
        'We could not read a clear event title and date from this image. Try a well-lit photo of the full poster, or use a different image.'
      );
      return;
    }

    router.push({
      pathname: '/add/preview',
      params: {
        eventData: encodeURIComponent(JSON.stringify(eventData)),
        posterImageUri: imageUri,
      },
    });
    onComplete?.();
  } catch (error) {
    console.error('[processPosterImage] Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    let alertTitle = 'Processing error';
    let userMessage =
      'We could not extract event information from this image. Try a clearer photo or check your connection.';
    if (errorMessage.includes('No text detected') || errorMessage.includes('No text content')) {
      userMessage =
        'No text was detected in the image. Please ensure the image is clear and contains readable text.';
    } else if (errorMessage.includes('Text extraction failed')) {
      userMessage = 'Text extraction failed. The image may be too blurry or low quality.';
    } else if (
      errorMessage.includes('No primary event') ||
      errorMessage.includes('Vision extraction failed')
    ) {
      alertTitle = 'No event found';
      userMessage =
        'We could not identify an event on this poster. Try a clearer photo of the full poster.';
    }

    onComplete?.();
    Alert.alert(alertTitle, userMessage, [{ text: 'OK' }]);
  }
}
