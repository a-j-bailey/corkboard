# Vision-Based Event Extraction Setup

This app now supports high-accuracy event extraction using vision-language models (xAI Grok or OpenAI GPT-4 Vision) with automatic fallback to on-device OCR.

## How It Works

1. **Primary Method (High Accuracy)**: Vision-based extraction using xAI Grok or OpenAI GPT-4 Vision
   - Processes the image directly with a vision model
   - Understands context, layout, and relationships between elements
   - Much more accurate than OCR + rule-based parsing

2. **Fallback Method**: On-device OCR + intelligent parsing
   - Uses Apple Vision framework for text extraction
   - Uses Apple Intelligence (if available) or rule-based parsing
   - Works offline and maintains privacy

## Setup Instructions

### Option 1: xAI Grok (Recommended)

1. Sign up for an xAI account at https://console.x.ai/
2. Generate an API key from the API Keys section
3. Add the API key to your environment:

**For development:**
Create a `.env` file in the project root:
```
EXPO_PUBLIC_XAI_API_KEY=your_api_key_here
```

**For production (EAS Build):**
Add to `app.json` under `extra`:
```json
{
  "expo": {
    "extra": {
      "xaiApiKey": "your_api_key_here"
    }
  }
}
```

### Option 2: OpenAI GPT-4 Vision

1. Sign up for an OpenAI account at https://platform.openai.com/
2. Generate an API key
3. Add the API key to your environment:

**For development:**
```
EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here
```

**For production:**
```json
{
  "expo": {
    "extra": {
      "openaiApiKey": "your_api_key_here"
    }
  }
}
```

## Priority Order

The app will try methods in this order:
1. xAI Grok (if `XAI_API_KEY` is set)
2. OpenAI GPT-4 Vision (if `OPENAI_API_KEY` is set and xAI is not)
3. On-device OCR + parsing (always available as fallback)

## Pricing

- **xAI Grok**: Check current pricing at https://x.ai/api/
- **OpenAI GPT-4 Vision**: Check pricing at https://openai.com/pricing
- **On-device**: Free (no API costs)

## Security Notes

- Never commit API keys to version control
- Use environment variables or secure configuration
- The `.env` file is already in `.gitignore`
- For production, use EAS Secrets or secure environment variable management

## Testing

The app will automatically log which method is being used. Check the console logs:
- `[VisionExtraction]` - Vision-based extraction
- `[TextExtraction]` - OCR extraction
- `[EventParser]` - Text parsing

