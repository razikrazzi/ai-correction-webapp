import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Initialize Google Gemini AI client
let geminiClient;
let geminiModel;

try {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCh2fq6FXJPks8Wv6i3gJyzzD6-yFbONhg';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash for better compatibility, or gemini-2.0-flash-exp for latest
  geminiModel = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  console.log('Google Gemini AI client initialized successfully');
} catch (error) {
  console.error('Error initializing Google Gemini AI:', error.message);
  console.warn('Gemini API will not be available. Please configure GEMINI_API_KEY');
}

/**
 * Convert image file to base64
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{mimeType: string, data: string}>} Base64 encoded image
 */
const imageToBase64 = async (imagePath) => {
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  
  const mimeType = mimeTypes[ext] || 'image/jpeg';
  
  return { mimeType, data: base64Image };
};

/**
 * Extract text from an image file using Google Gemini AI
 * Optimized for handwriting recognition
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} OCR results with extracted text and confidence
 */
export const extractTextFromImageWithGemini = async (imagePath) => {
  if (!geminiModel) {
    throw new Error('Google Gemini AI client is not initialized. Please configure GEMINI_API_KEY.');
  }

  try {
    // Check if file exists
    try {
      await fs.access(imagePath);
    } catch {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Convert image to base64
    const { mimeType, data } = await imageToBase64(imagePath);

    // Prepare prompt for text extraction (handwritten and printed)
    const prompt = `Extract all text from this image. Include both handwritten and printed text. 
    Return the text exactly as it appears, preserving line breaks and structure. 
    If there is handwriting, transcribe it accurately. 
    If the image contains no text, return an empty string.`;

    // Call Gemini API
    const result = await geminiModel.generateContent([
      {
        inlineData: {
          data: data,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const extractedText = response.text() || '';

    // Calculate word count
    const wordCount = extractedText.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Estimate confidence (Gemini doesn't provide confidence scores, so we estimate based on text length)
    // If text was extracted, assume reasonable confidence
    const confidence = extractedText.length > 0 ? 85 : 0;

    return {
      text: extractedText,
      confidence: confidence,
      wordCount: wordCount,
      pages: 1, // Gemini processes single images
      raw: {
        model: 'gemini-1.5-flash',
        extractedText: extractedText
      }
    };
  } catch (error) {
    console.error('Error extracting text from image with Gemini:', error);
    throw new Error(`Gemini OCR processing failed: ${error.message}`);
  }
};

/**
 * Evaluate student paper using Google Gemini AI
 * @param {string} extractedText - OCR output of the student's answer
 * @param {Object} paperConfig - Configuration containing sections, answer key, and grading rules
 * @returns {Promise<Object>} Structured evaluation result
 */
export const evaluatePaperWithGemini = async (extractedText, paperConfig) => {
  if (!geminiModel) {
    throw new Error('Google Gemini AI client is not initialized. Please configure GEMINI_API_KEY.');
  }

  try {
    const { sections, totalMarks, gradingSettings } = paperConfig;

    const systemRole = `
    📌 SYSTEM ROLE 
    You are an AI exam evaluator. 
    Your task is to evaluate student answer papers by comparing them with an official answer key, using section-wise marking, and produce fair, explainable marks.
    
    You must support:
    - Handwritten answers (already transcribed)
    - Partial answers
    - Concept-based evaluation (not exact wording)

    🧠 EVALUATION INSTRUCTIONS (VERY IMPORTANT)
    1️⃣ TEXT UNDERSTANDING
    - Read the student answer carefully.
    - Ignore spelling errors, poor handwriting artifacts, minor grammatical mistakes.
    - Focus on meaning and intent, not exact wording.

    2️⃣ SECTION IDENTIFICATION
    - Split the student answer into sections based on section titles or question numbers.
    - If labels are missing, infer boundaries logically.

    3️⃣ ANSWER MATCHING (PER SECTION)
    - Compare student answer with answer key using: Keyword coverage, Concept similarity, Logical correctness, Completeness.
    - Use semantic understanding.

    4️⃣ SCORING RULES (PER SECTION)
    - Start from 0 marks.
    - 90–100% correct → Full marks
    - 70–89% correct → High marks
    - 40–69% correct → Partial marks
    - Below 40% → Low marks
    - If irrelevant/incorrect → 0 marks
    - Negative marking: ${gradingSettings.negativeMarking ? 'Enabled' : 'Disabled'}
    - Final marks must never go below 0.

    5️⃣ HANDWRITING & LENGTH CONSIDERATION
    - Do NOT penalize for poor handwriting or OCR errors.
    - If explanation is extremely short → reduce marks.
    - If well-structured → reward clarity.

    6️⃣ FINAL CALCULATION
    - Calculate section-wise marks, total marks, percentage.
    - Decide pass/fail based on passing percentage (${gradingSettings.passingPercentage}%).
    `;

    const inputs = `
    📥 INPUTS
    
    --- Extracted Student Answer Text ---
    ${extractedText}
    
    --- Answer Key & Section Configuration ---
    ${JSON.stringify(sections, null, 2)}
    
    --- Grading Rules ---
    Total Marks: ${totalMarks}
    Passing Percentage: ${gradingSettings.passingPercentage}%
    Negative Marking: ${gradingSettings.negativeMarking}
    `;

    const outputFormat = `
    📤 OUTPUT FORMAT (STRICT – JSON ONLY)
    Return your response strictly in the following JSON format:
    {
      "sections": [
        {
          "sectionName": "Section A",
          "maxMarks": 25,
          "awardedMarks": 18,
          "reason": "Student covered main concepts but missed one key point."
        }
      ],
      "totalMarks": 60,
      "percentage": 60,
      "pass": true,
      "overallFeedback": "Good conceptual understanding..."
    }
    
    ⚠️ IMPORTANT RULES
    - Never hallucinate answers.
    - Be fair and consistent.
    - Marks must match section limits.
    - Output must always be valid JSON.
    `;

    const result = await geminiModel.generateContent([
      systemRole,
      inputs,
      outputFormat
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);

  } catch (error) {
    console.error('Gemini Paper Evaluation Error:', error);
    throw error;
  }
};

/**
 * Process a PDF file with Gemini (if supported)
 * Note: Gemini may have limitations with PDFs, so we convert first page to image
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} OCR results
 */
export const extractTextFromPDFWithGemini = async (filePath) => {
  // For now, treat PDFs the same as images
  // In production, you might want to convert PDF pages to images first
  return await extractTextFromImageWithGemini(filePath);
};

/**
 * Main function to process any file type (image or PDF) using Gemini
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} Complete OCR results
 */
export const processFileWithGemini = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const isPDF = ext === '.pdf';

    // Extract text using Gemini
    const ocrResult = isPDF 
      ? await extractTextFromPDFWithGemini(filePath)
      : await extractTextFromImageWithGemini(filePath);

    // Use OCR confidence for handwriting score
    const hasHandwriting = ocrResult.wordCount > 0;
    const handwritingScore = ocrResult.confidence;

    return {
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      wordCount: ocrResult.wordCount,
      handwritingScore: handwritingScore,
      readabilityScore: ocrResult.confidence,
      pages: ocrResult.pages || 1,
      hasHandwriting: hasHandwriting,
      raw: ocrResult.raw
    };
  } catch (error) {
    console.error('Error processing file with Gemini API:', error);
    throw error;
  }
};

export default {
  extractTextFromImageWithGemini,
  extractTextFromPDFWithGemini,
  processFileWithGemini
};

