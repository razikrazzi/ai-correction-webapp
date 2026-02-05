# Google Cloud Vision API Integration

The Answer Paper Correction system now uses Google Cloud Vision API for handwritten text recognition (OCR) instead of mock processing.

## What's Changed

### New Features
- ✅ Real OCR processing using Google Cloud Vision API
- ✅ Handwriting recognition for scanned answer papers
- ✅ Support for multiple file formats (JPEG, PNG, PDF, etc.)
- ✅ Confidence scoring for extracted text
- ✅ Word count and readability analysis

### Files Modified/Created

1. **`server/package.json`**
   - Added `@google-cloud/vision` dependency

2. **`server/src/services/visionService.js`** (NEW)
   - Service for Google Cloud Vision API integration
   - Functions:
     - `extractTextFromImage()` - Extract text from image files
     - `detectHandwriting()` - Detect handwriting in images
     - `extractTextFromPDF()` - Extract text from PDF files
     - `processFileWithVision()` - Main processing function

3. **`server/src/controllers/paperController.js`**
   - Updated `processPaperInBackground()` to use Vision API
   - Removed mock/simulated processing
   - Now performs real OCR processing

4. **`server/env.sample`**
   - Added Google Cloud Vision API configuration options

5. **`server/GOOGLE_CLOUD_VISION_SETUP.md`** (NEW)
   - Complete setup guide for Vision API

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Set Up Google Cloud Vision API

Follow the detailed guide in `GOOGLE_CLOUD_VISION_SETUP.md` or:

1. Enable Vision API in Google Cloud Console
2. Create a service account with Vision API User role
3. Download the service account key JSON file
4. Add to `.env`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json
   ```

### 3. Start the Server
```bash
npm run dev
```

## How It Works

When a paper is uploaded:

1. **Upload**: File is saved to `uploads/original/`
2. **Processing Starts**: Background job begins
3. **Image Preprocessing**: File is prepared for OCR
4. **Handwriting Detection**: Vision API detects handwriting
5. **Text Extraction (OCR)**: Vision API extracts all text
6. **Answer Analysis**: Text is analyzed
7. **Section-wise Grading**: Marks are calculated
8. **Results Saved**: Extracted text and analysis saved to MongoDB

## API Response Format

The OCR results include:
```javascript
{
  extractedText: "Full text extracted from the image",
  handwritingScore: 85, // Confidence score (0-100)
  readabilityScore: 90, // Readability metric (0-100)
  wordCount: 523, // Number of words extracted
  confidence: 92.5, // Overall OCR confidence (0-100)
  estimatedTime: 6, // Estimated grading time in minutes
  sectionMarks: { // Marks per section
    "Section A": 20,
    "Section B": 18,
    ...
  },
  overallFeedback: "Feedback message"
}
```

## Error Handling

If Vision API is not configured:
- Server will still start
- Processing will fail with a clear error message
- Error will be logged in the paper status

## Cost Considerations

Google Cloud Vision API Pricing:
- First 1,000 units/month: **FREE**
- After that: ~$1.50 per 1,000 units
- 1 unit = 1 page (image or PDF page)

Monitor usage in Google Cloud Console to avoid unexpected charges.

## Testing

To test without Vision API (development):
1. Upload a paper
2. Check console for initialization message
3. If credentials are missing, you'll see a warning

To test with Vision API:
1. Configure credentials as described above
2. Upload a paper (JPG, PNG, or PDF)
3. Wait for processing (usually 5-30 seconds)
4. Check paper status endpoint for results

## Troubleshooting

**Error: "Google Cloud Vision API client is not initialized"**
- Check credentials configuration
- Verify service account key file exists
- Ensure Vision API is enabled in GCP project

**Error: "OCR processing failed"**
- Check file format is supported
- Verify image quality is sufficient
- Check GCP project billing is enabled

**Processing takes too long**
- Large PDFs may take several minutes
- Check network connectivity to Google Cloud
- Monitor GCP quotas and limits

