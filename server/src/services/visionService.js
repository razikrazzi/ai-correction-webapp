import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { processFileWithGemini } from './geminiService.js';

// Initialize Google Cloud Vision client
// Supports both service account key file and environment variable
let visionClient;

try {
  // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to key file
  // Option 2: Use service account key JSON directly from environment
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  } else if (process.env.GOOGLE_CLOUD_VISION_KEY) {
    // If key is stored as JSON string in environment variable
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_VISION_KEY);
    visionClient = new ImageAnnotatorClient({ credentials });
  } else {
    // Try default credentials (for GCP environments)
    visionClient = new ImageAnnotatorClient();
  }
  console.log('Google Cloud Vision API client initialized successfully');
} catch (error) {
  console.error('Error initializing Google Cloud Vision API:', error.message);
  console.warn('Vision API will not be available. Please configure GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_VISION_KEY');
}

/**
 * Extract text from an image file using Google Cloud Vision API
 * Optimized for handwriting recognition using languageHints
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} OCR results with extracted text and confidence
 */
export const extractTextFromImage = async (imagePath) => {
  if (!visionClient) {
    throw new Error('Google Cloud Vision API client is not initialized. Please configure credentials.');
  }

  try {
    // Check if file exists (async check)
    try {
      await fs.access(imagePath);
    } catch {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Read file content asynchronously
    const imageContent = await fs.readFile(imagePath);

    // Prepare request with handwriting language hint for better recognition
    const request = {
      image: {
        content: imageContent,
      },
      imageContext: {
        languageHints: ['en-t-i0-handwrit'], // Handwriting language hint for English
      },
    };

    // Detect document text (handwriting and printed text) with timeout
    const timeoutMs = 60000; // 60 seconds timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Vision API request timeout after 60 seconds')), timeoutMs)
    );

    const [result] = await Promise.race([
      visionClient.documentTextDetection(request),
      timeoutPromise
    ]);
    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation) {
      return {
        text: '',
        confidence: 0,
        wordCount: 0,
        pages: 0
      };
    }

    const extractedText = fullTextAnnotation.text || '';
    const pages = fullTextAnnotation.pages || [];
    
    // Calculate average confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    pages.forEach(page => {
      page.blocks?.forEach(block => {
        block.paragraphs?.forEach(paragraph => {
          paragraph.words?.forEach(word => {
            const symbols = word.symbols || [];
            symbols.forEach(symbol => {
              if (symbol.confidence) {
                totalConfidence += symbol.confidence;
                confidenceCount++;
              }
            });
          });
        });
      });
    });

    const avgConfidence = confidenceCount > 0 
      ? (totalConfidence / confidenceCount) * 100 
      : 0;

    // Count words
    const wordCount = extractedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    return {
      text: extractedText,
      confidence: Math.round(avgConfidence * 100) / 100, // Round to 2 decimal places
      wordCount: wordCount,
      pages: pages.length,
      raw: fullTextAnnotation
    };
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};

/**
 * Detect handwriting in an image using handwriting-specific language hints
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Handwriting detection results
 */
export const detectHandwriting = async (imagePath) => {
  if (!visionClient) {
    throw new Error('Google Cloud Vision API client is not initialized');
  }

  try {
    // Read file content asynchronously
    const imageContent = await fs.readFile(imagePath);

    // Use text detection with handwriting language hint
    const request = {
      image: {
        content: imageContent,
      },
      imageContext: {
        languageHints: ['en-t-i0-handwrit'], // Handwriting language hint
      },
    };

    const [result] = await visionClient.textDetection(request);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return {
        hasHandwriting: false,
        confidence: 0
      };
    }

    // Calculate average confidence
    let totalConfidence = 0;
    let count = 0;

    detections.forEach(detection => {
      if (detection.confidence) {
        totalConfidence += detection.confidence;
        count++;
      }
    });

    const avgConfidence = count > 0 ? (totalConfidence / count) * 100 : 0;

    return {
      hasHandwriting: detections.length > 1, // First detection is usually the entire text
      confidence: Math.round(avgConfidence * 100) / 100,
      textBlocks: detections.length - 1 // Excluding the first full text annotation
    };
  } catch (error) {
    console.error('Error detecting handwriting:', error);
    throw new Error(`Handwriting detection failed: ${error.message}`);
  }
};

/**
 * Process a PDF file with handwriting recognition
 * Note: Google Cloud Vision API supports PDF directly
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} OCR results
 */
export const extractTextFromPDF = async (filePath) => {
  if (!visionClient) {
    throw new Error('Google Cloud Vision API client is not initialized. Please configure credentials.');
  }

  try {
    // Check if file exists (async check)
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read PDF file content asynchronously
    const pdfContent = await fs.readFile(filePath);

    // Prepare request with handwriting language hint
    const request = {
      image: {
        content: pdfContent,
      },
      imageContext: {
        languageHints: ['en-t-i0-handwrit'], // Handwriting language hint for English
      },
    };

    // Detect document text from PDF with timeout
    const timeoutMs = 90000; // 90 seconds timeout for PDFs (they can be larger)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Vision API request timeout after 90 seconds')), timeoutMs)
    );

    const [result] = await Promise.race([
      visionClient.documentTextDetection(request),
      timeoutPromise
    ]);
    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation) {
      return {
        text: '',
        confidence: 0,
        wordCount: 0,
        pages: 0
      };
    }

    const extractedText = fullTextAnnotation.text || '';
    const pages = fullTextAnnotation.pages || [];
    
    // Calculate average confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    pages.forEach(page => {
      page.blocks?.forEach(block => {
        block.paragraphs?.forEach(paragraph => {
          paragraph.words?.forEach(word => {
            const symbols = word.symbols || [];
            symbols.forEach(symbol => {
              if (symbol.confidence) {
                totalConfidence += symbol.confidence;
                confidenceCount++;
              }
            });
          });
        });
      });
    });

    const avgConfidence = confidenceCount > 0 
      ? (totalConfidence / confidenceCount) * 100 
      : 0;

    // Count words
    const wordCount = extractedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    return {
      text: extractedText,
      confidence: Math.round(avgConfidence * 100) / 100,
      wordCount: wordCount,
      pages: pages.length,
      raw: fullTextAnnotation
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`PDF OCR processing failed: ${error.message}`);
  }
};

/**
 * Main function to process any file type (image or PDF)
 * OPTIMIZED: Removed duplicate handwriting detection call - documentTextDetection already handles handwriting
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} Complete OCR results
 */
export const processFileWithVision = async (filePath) => {
  try {
    // Try Gemini AI first (better for handwriting recognition)
    try {
      console.log(`Attempting to process ${filePath} with Gemini AI...`);
      const geminiResult = await processFileWithGemini(filePath);
      console.log(`Successfully processed with Gemini AI - extracted ${geminiResult.wordCount} words`);
      return geminiResult;
    } catch (geminiError) {
      console.warn(`Gemini AI processing failed, falling back to Vision API:`, geminiError.message);
      
      // Fallback to Vision API if Gemini fails
      if (!visionClient) {
        throw new Error('Both Gemini AI and Vision API are unavailable. Please configure at least one.');
      }

      const ext = path.extname(filePath).toLowerCase();
      const isPDF = ext === '.pdf';

      // Single API call - documentTextDetection already handles handwriting recognition
      // This eliminates the duplicate detectHandwriting() call, saving ~50% processing time
      const ocrResult = isPDF 
        ? await extractTextFromPDF(filePath)
        : await extractTextFromImage(filePath);

      // Use OCR confidence for handwriting score (documentTextDetection already optimized for handwriting)
      // If text was extracted, assume handwriting is present
      const hasHandwriting = ocrResult.wordCount > 0;
      const handwritingScore = ocrResult.confidence; // Use OCR confidence as handwriting quality indicator

      return {
        extractedText: ocrResult.text,
        confidence: ocrResult.confidence,
        wordCount: ocrResult.wordCount,
        handwritingScore: handwritingScore,
        readabilityScore: ocrResult.confidence, // Using OCR confidence as readability metric
        pages: ocrResult.pages || 1,
        hasHandwriting: hasHandwriting,
        raw: ocrResult.raw
      };
    }
  } catch (error) {
    console.error('Error processing file with Vision API:', error);
    throw error;
  }
};

export default {
  extractTextFromImage,
  detectHandwriting,
  extractTextFromPDF,
  processFileWithVision
};

