import Constants from 'expo-constants';
import { Router } from 'expo-router';
import { Alert } from 'react-native';
import { extractEventFromImage } from '../../../services/visionExtraction';

/**
 * Processes a poster image URI: extracts event data via vision, then navigates to preview.
 * Callers should set loading state before calling and pass onComplete to clear it.
 */
export async function processPosterImage(
  imageUri: string,
  router: Router,
  options?: { onComplete?: () => void }
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

    const eventData = await extractEventFromImage(imageUri, xaiApiKey);

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

    let userMessage = 'Failed to extract event information. ';
    if (errorMessage.includes('No text detected') || errorMessage.includes('No text content')) {
      userMessage =
        'No text was detected in the image. Please ensure the image is clear and contains readable text. ';
    } else if (errorMessage.includes('Text extraction failed')) {
      userMessage =
        'Text extraction failed. The image may be too blurry or low quality. ';
    }
    userMessage += 'You can still manually enter the details in the preview screen.';

    Alert.alert('Processing Error', userMessage, [
      {
        text: 'Try Again',
        onPress: () => onComplete?.(),
      },
      {
        text: 'Enter Manually',
        onPress: () => {
          router.push({
            pathname: '/add/preview',
            params: {
              eventData: encodeURIComponent(JSON.stringify({})),
              posterImageUri: imageUri,
            },
          });
          onComplete?.();
        },
      },
    ]);
    onComplete?.();
  }
}
