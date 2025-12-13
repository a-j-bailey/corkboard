import { getTextFromFrame } from 'expo-text-recognition';

/**
 * Extracts text from an image using Apple's Vision framework
 * @param imageUri - URI of the image to process (file:// or asset://)
 * @returns Promise that resolves to the extracted text as a single string
 * @throws Error if text extraction fails
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  console.log('[TextExtraction] Starting text extraction from image');
  console.log('[TextExtraction] Image URI:', imageUri);
  
  try {
    // Validate input
    if (!imageUri || imageUri.trim().length === 0) {
      console.error('[TextExtraction] Invalid image URI provided');
      throw new Error('Invalid image URI provided');
    }

    console.log('[TextExtraction] Calling Vision framework OCR...');
    // expo-text-recognition expects a file path or base64 string
    // imageUri from expo-camera or expo-image-picker is typically a file:// URI
    const textArray = await getTextFromFrame(imageUri, false);
    
    console.log('[TextExtraction] OCR completed. Text blocks found:', textArray?.length || 0);
    
    if (!textArray || textArray.length === 0) {
      console.warn('[TextExtraction] No text detected in the image');
      throw new Error('No text detected in the image');
    }
    
    // Join all text blocks into a single string
    // The array may contain multiple text blocks detected in different regions
    const fullText = textArray.join('\n').trim();
    
    console.log('[TextExtraction] Extracted text length:', fullText.length, 'characters');
    console.log('[TextExtraction] Extracted text preview:', fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''));
    
    if (!fullText) {
      console.warn('[TextExtraction] No text content found after joining blocks');
      throw new Error('No text content found in the image');
    }
    
    console.log('[TextExtraction] Text extraction successful');
    return fullText;
  } catch (error) {
    console.error('[TextExtraction] Error during text extraction:', error);
    // Re-throw with more context if it's already our error
    if (error instanceof Error) {
      // If it's already a descriptive error, re-throw as-is
      if (error.message.includes('No text') || error.message.includes('Invalid image')) {
        throw error;
      }
      throw new Error(`Text extraction failed: ${error.message}`);
    }
    throw new Error('Text extraction failed: Unknown error');
  }
}

