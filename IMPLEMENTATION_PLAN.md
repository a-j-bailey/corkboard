# Event Flyer Processing - Implementation Plan

## Overview
Rebuild the Add page logic to extract event details from poster/flyer images using on-device processing on iOS. The design will remain unchanged, but all processing logic will be rewritten.

## Goals
- Point camera at poster/event flyer
- Process image on-device (no cloud processing)
- Extract event details: title, date, time, location, price, description, website, social media, organization
- Format into JSON matching Event type structure
- Save to database

## Technology Stack Analysis

### Option 1: expo-text-recognition (RECOMMENDED - Simplest)
**Package**: `expo-text-recognition` v0.1.1 by vishaljak
- ✅ Expo-compatible (no native code changes needed)
- ✅ Uses Apple Vision framework on iOS
- ✅ On-device processing
- ✅ Simple API
- ⚠️ Early version (0.1.1) - may need testing
- ⚠️ Community package - verify it works with your Expo SDK

**Installation**:
```bash
npx expo install expo-text-recognition
```

**Usage**:
```typescript
import * as TextRecognition from 'expo-text-recognition';

const result = await TextRecognition.recognizeText(imageUri);
// Returns array of text blocks with bounding boxes
```

### Option 2: react-native-vision-camera-ocr-plus (RECOMMENDED - Most Robust)
**Packages**: 
- `react-native-vision-camera` (requires dev client - you have this)
- `react-native-vision-camera-ocr-plus` (maintained fork, v1.0.13)

- ✅ Well-maintained (recently updated Dec 2024)
- ✅ Uses ML Kit (works on iOS and Android, but you only need iOS)
- ✅ High performance
- ✅ Real-time text detection capability
- ✅ More features and better documentation
- ⚠️ Requires expo-dev-client (you have this ✅)
- ⚠️ More complex setup than expo-text-recognition
- ⚠️ Overkill if only processing static images (but more reliable)

**Installation**:
```bash
npm install react-native-vision-camera react-native-vision-camera-ocr-plus
cd ios && pod install
```

**Best for**: Production apps needing reliable OCR with good maintenance

### Option 3: react-native-vision-camera-text-recognition
**Package**: `react-native-vision-camera-text-recognition` v3.1.1
- ✅ Uses ML Kit
- ✅ Well-established
- ⚠️ Less actively maintained than ocr-plus fork
- ⚠️ Requires react-native-vision-camera

### Option 4: Custom Native Module
**Approach**: Create native iOS module wrapping Vision framework directly
- ✅ Full control
- ✅ Optimized for your use case
- ⚠️ Requires native iOS development
- ⚠️ More maintenance overhead

## Recommended Approach

**Primary Recommendation**: Start with `expo-text-recognition` for simplicity. If it doesn't meet your needs, upgrade to `react-native-vision-camera-ocr-plus`.

**Why**: 
- You already have `expo-dev-client` so both options work
- `expo-text-recognition` is simpler to integrate
- Can always upgrade if needed
- Both use on-device processing (Vision framework or ML Kit)

### Phase 1: Text Extraction (OCR)
1. Install `expo-text-recognition`
2. Capture/select image using existing `expo-camera` and `expo-image-picker`
3. Process image with OCR to extract all text blocks
4. Get text with bounding box information for spatial understanding

### Phase 2: Text Parsing & Data Extraction
After OCR, parse the extracted text to identify structured data:

#### Parsing Strategy:
1. **Spatial Analysis**: Use bounding boxes to identify:
   - Title (usually largest text, top-center)
   - Date/Time (often grouped together)
   - Location (may be near bottom)
   - Price (often formatted with $ or currency symbols)

2. **Pattern Matching**:
   - **Dates**: Regex for various formats (MM/DD/YYYY, Month DD, YYYY, etc.)
   - **Times**: Regex for 12/24 hour formats, time ranges
   - **Prices**: Regex for currency symbols, dollar amounts
   - **URLs**: Regex for http/https links
   - **Social Media**: Regex for @handles, #hashtags
   - **Emails**: Regex for email patterns

3. **Natural Language Processing**:
   - Identify title (first large text block, often contains event keywords)
   - Extract description (longer text blocks, paragraphs)
   - Identify organization name (often near contact info)

4. **Contextual Understanding**:
   - Keywords like "Date:", "Time:", "Location:", "Venue:", "Price:", "Cost:"
   - Relative positioning of text blocks
   - Font size hierarchy

### Phase 3: Data Structuring
Format extracted data into Event type:
```typescript
{
  title: string;
  date: string; // ISO format preferred
  time?: string;
  address?: string;
  cost?: string;
  websiteUrl?: string;
  socialMediaHandles?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  description?: string;
  organizationName?: string;
  thumbnailImage: string;
  posterImage: string;
}
```

### Phase 4: Error Handling & Validation
- Handle cases where OCR fails or returns no text
- Validate extracted dates/times
- Provide user feedback for manual correction
- Allow user to edit extracted data before saving

## Implementation Steps

### Step 1: Install Dependencies
```bash
npx expo install expo-text-recognition
```

### Step 2: Create Text Extraction Service
Create `services/textExtraction.ts`:
- Function to extract text from image URI
- Returns structured text blocks with positions

### Step 3: Create Event Parser Service
Create `services/eventParser.ts`:
- Parse extracted text blocks
- Identify and extract event fields
- Use regex patterns and spatial analysis
- Return structured Event data

### Step 4: Update add.tsx
- Remove Apple Intelligence logic
- Integrate text extraction service
- Integrate event parser service
- Keep existing UI/design
- Add loading states and error handling

### Step 5: Testing
- Test with various poster designs
- Test with different fonts and layouts
- Test edge cases (poor lighting, blurry images)
- Validate extracted data accuracy

## Alternative: Enhanced Approach with ML

If basic parsing isn't accurate enough, consider:

### Option A: Core ML Model
- Train a lightweight Core ML model for event field extraction
- Use Apple's Create ML or convert from other frameworks
- More accurate but requires training data

### Option B: Structured Parsing with Rules
- Build a rule-based parser with extensive patterns
- Use NLP techniques for better understanding
- Combine multiple heuristics for accuracy

## File Structure
```
/services
  /textExtraction.ts    - OCR wrapper
  /eventParser.ts       - Text parsing logic
  /dateParser.ts        - Date/time extraction
  /urlExtractor.ts      - URL and social media extraction
/utils
  /textUtils.ts         - Text processing utilities
```

## Detailed Parsing Implementation

### Text Extraction Output Structure
Most OCR libraries return text blocks with:
- `text`: The recognized text string
- `bounds`: Bounding box coordinates (x, y, width, height)
- `confidence`: Recognition confidence score (if available)

### Parsing Algorithm Flow

1. **Pre-process Text Blocks**:
   - Sort by position (top to bottom, left to right)
   - Group nearby text blocks (likely same line/paragraph)
   - Identify font size hierarchy (if available)

2. **Extract Structured Fields**:

   **Title Detection**:
   - Usually largest font size
   - Top-center or top-left position
   - Often first 1-3 text blocks
   - May contain event keywords (Concert, Festival, Workshop, etc.)

   **Date Extraction**:
   - Look for date patterns: `MM/DD/YYYY`, `DD/MM/YYYY`, `Month DD, YYYY`, `YYYY-MM-DD`
   - Keywords: "Date:", "When:", "On"
   - Relative to title (often below it)

   **Time Extraction**:
   - Patterns: `HH:MM`, `H:MM AM/PM`, `HH:MM - HH:MM`
   - Keywords: "Time:", "At:", "From", "To"
   - Often near date

   **Location Extraction**:
   - Keywords: "Location:", "Venue:", "Address:", "Where:"
   - Often contains street addresses, city names
   - May be near bottom of poster

   **Price Extraction**:
   - Patterns: `$XX`, `$XX.XX`, `Free`, `Donation`
   - Keywords: "Price:", "Cost:", "Tickets:", "Admission:"
   - Currency symbols

   **URL Extraction**:
   - Regex: `https?://[^\s]+`
   - Often at bottom
   - May be shortened (bit.ly, etc.)

   **Social Media**:
   - Twitter: `@username` or `twitter.com/username`
   - Instagram: `@username` or `instagram.com/username`
   - Facebook: `facebook.com/username` or `fb.com/username`

   **Description**:
   - Longer text blocks (multiple lines)
   - Usually in middle section
   - May contain event details, lineup, etc.

   **Organization**:
   - Often near contact info
   - May be at top (as header) or bottom (as footer)
   - Could be part of URL domain

3. **Validation & Normalization**:
   - Validate dates (ensure they're in the future for events)
   - Normalize time formats
   - Clean up extracted text (remove extra whitespace)
   - Validate URLs

4. **Confidence Scoring**:
   - Assign confidence scores to each extracted field
   - Fields with high confidence can be auto-filled
   - Low confidence fields should be marked for user review

### Example Parsing Code Structure

```typescript
interface TextBlock {
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

interface ParsedEvent {
  title?: string;
  date?: string;
  time?: string;
  address?: string;
  cost?: string;
  websiteUrl?: string;
  socialMediaHandles?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  description?: string;
  organizationName?: string;
  confidence: number; // Overall confidence score
}

function parseEventFromTextBlocks(blocks: TextBlock[]): ParsedEvent {
  // 1. Sort and group text blocks
  // 2. Extract each field using patterns and spatial analysis
  // 3. Validate and normalize
  // 4. Calculate confidence scores
  // 5. Return structured event data
}
```

## Current Project Status
- **Expo SDK**: 54.0.28
- **Has expo-dev-client**: ✅ Yes
- **Current Implementation**: Uses Apple Intelligence (requires iOS 26+)
- **Target**: On-device processing using Vision/ML Kit

## Next Steps
1. ✅ Verify `expo-text-recognition` package availability and compatibility (DONE - package exists)
2. Install and test basic OCR functionality
3. Build parsing logic incrementally
4. Test with real event flyers
5. Refine parsing accuracy based on test results

## Notes
- Keep existing camera UI and design
- Maintain user experience flow
- Add progress indicators during processing
- Allow manual editing of extracted data
- Consider caching OCR results for performance

