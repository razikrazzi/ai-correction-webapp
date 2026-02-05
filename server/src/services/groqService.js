
import Groq from 'groq-sdk';
import sharp from 'sharp';
import fs from 'fs/promises';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const poppler = require('pdf-poppler');

const logToFile = (msg) => {
    try {
        const logPath = path.join(process.cwd(), 'debug_groq.log');
        appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n');
    } catch (e) {
        // ignore logging errors
    }
};

// Initialize Groq client
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    return new Groq({ apiKey });
};

/**
 * Convert PDF to images using pdf-poppler
 * @param {string} pdfPath 
 * @returns {Promise<string[]>} Array of image file paths
 */
const convertPdfToImages = async (pdfPath) => {
    logToFile(`Converting PDF: ${pdfPath}`);
    const outputDir = path.join(path.dirname(pdfPath), 'temp_images');

    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const opts = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null // null means all pages
    };

    try {
        await poppler.convert(pdfPath, opts);

        // valid output files are usually named prefix-1.png, prefix-2.png etc.
        const files = await fs.readdir(outputDir);
        const imageFiles = files
            .filter(f => f.startsWith(opts.out_prefix) && f.endsWith('.png'))
            .map(f => path.join(outputDir, f))
            .sort((a, b) => {
                // Sort by page number
                const numA = parseInt(a.match(/-(\d+)\.png$/)?.[1] || '0');
                const numB = parseInt(b.match(/-(\d+)\.png$/)?.[1] || '0');
                return numA - numB;
            });

        logToFile(`PDF converted to ${imageFiles.length} images`);
        return imageFiles;
    } catch (error) {
        logToFile(`PDF Conversion Error: ${error.message}`);
        console.error('PDF Conversion Error:', error);
        throw new Error(`Failed to convert PDF to images: ${error.message}`);
    }
};

/**
 * Encode image to base64
 * @param {string} imagePath 
 * @returns {Promise<string>} Base64 string
 */
const encodeImage = async (imagePath) => {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
};

/**
 * Extract text from a single image using Groq Vision
 * @param {string} imagePath 
 * @returns {Promise<Object>}
 */
const extractTextFromImage = async (imagePath) => {
    try {
        logToFile(`Processing image with Groq: ${imagePath}`);
        const groq = getGroqClient();
        const base64Image = await encodeImage(imagePath);

        // Using Llama 4 Scout as requested/documented
        // Fallback to llama-3.2-11b-vision-preview if 4 is not available yet in public API/account
        const model = 'meta-llama/llama-4-scout-17b-16e-instruct';

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Extract all text from this image given below. Return ONLY the extracted text. Do not add any conversational filler. Maintain the structure (newlines) as much as possible."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            model: model,
            temperature: 0.5,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false
        });

        const extractedText = completion.choices[0]?.message?.content || '';
        logToFile('Groq extraction complete.');

        return {
            text: extractedText,
            confidence: 90 // Groq doesn't give confidence, assuming high
        };
    } catch (error) {
        logToFile(`Groq API Error: ${error.message}`);

        // Fallback or retry logic could go here
        // For now, throw
        throw error;
    }
};

/**
 * Main function to process file
 * @param {string} filePath 
 */
export const processFileWithGroq = async (filePath) => {
    try {
        logToFile(`Starting processFileWithGroq for: ${filePath}`);

        const ext = path.extname(filePath).toLowerCase();
        let imagePaths = [];
        let cleanupNeeded = false;

        if (ext === '.pdf') {
            imagePaths = await convertPdfToImages(filePath);
            cleanupNeeded = true;
        } else {
            imagePaths = [filePath];
        }

        let fullText = '';
        let totalConfidence = 0;
        let wordCount = 0;
        let pagesProcessed = 0;

        for (const imgPath of imagePaths) {
            logToFile(`Processing page: ${imgPath}`);

            // Optional: You could still use sharp to resize/optimize if needed before sending to Groq, 
            // but Groq handles standard images well. 
            // We might want to ensure it's not too huge (20MB limit).

            const data = await extractTextFromImage(imgPath);

            fullText += data.text + '\n\n';
            totalConfidence += data.confidence;

            // Count words (rough estimate from text)
            const words = data.text.trim().split(/\s+/).length;
            wordCount += words;

            pagesProcessed++;
        }

        // Cleanup temp files if needed
        if (cleanupNeeded) {
            try {
                const tempDir = path.dirname(imagePaths[0]);
                for (const img of imagePaths) {
                    await fs.unlink(img);
                }
                await fs.rmdir(tempDir).catch(() => { });
                logToFile('Cleanup complete');
            } catch (e) {
                logToFile(`Cleanup failed: ${e.message}`);
            }
        }

        const avgConfidence = pagesProcessed > 0 ? totalConfidence / pagesProcessed : 0;
        logToFile(`Processing complete. Word count: ${wordCount}`);

        return {
            extractedText: fullText.trim(),
            confidence: Math.round(avgConfidence),
            wordCount: wordCount,
            pages: pagesProcessed,
            hasHandwriting: true,
            handwritingScore: 85,
            readabilityScore: 85,
            raw: {
                engine: 'groq-vision',
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                pages: pagesProcessed
            }
        };

    } catch (error) {
        logToFile(`Service Error: ${error.message} \nStack: ${error.stack}`);
        console.error('Groq Service Error:', error);
        throw error;
    }
};

/**
 * Evaluate student paper using Groq Reasoning Model (DeepSeek R1 Distill / Qwen / Llama 3)
 * @param {string} studentText - Student's answer text
 * @param {string} answerKeyText - Teacher's answer key text
 * @param {Object} paperConfig - Configuration containing sections, totalMarks, etc.
 * @returns {Promise<Object>} Evaluation result
 */
export const evaluatePaperWithGroq = async (studentText, answerKeyText, paperConfig) => {
    try {
        logToFile('Starting paper evaluation with Groq Reasoning...');
        const groq = getGroqClient();

        // Construct a reasoning prompt
        const prompt = `
        You are an expert academic evaluator. Your task is to grade a student's answer paper against an answer key.
        
        Input Data:
        1. Student's Answers (Extracted Text):
        ${studentText}

        2. Answer Key (Reference):
        ${answerKeyText}

        3. Grading Configuration:
        - Total Marks: ${paperConfig.totalMarks}
        - Sections: ${JSON.stringify(paperConfig.sections)}
        - Negative Marking: ${paperConfig.gradingSettings?.negativeMarking ? 'Yes' : 'No'}
        - Grading Mode: ${paperConfig.gradingMode || 'section'}
        - Analysis Options: ${JSON.stringify(paperConfig.aiOptions || {})}
        
        Task:
        - For each section defined in the configuration, locate the corresponding answer in the student's text.
        - Compare the student's answer with the answer key for that section.
        - Evaluate based on conceptual clarity, correctness, and completeness.
        - Apply specified Analysis Options (e.g., if Strict Grammar is enabled, deduct marks for grammar).
        - Assign marks for each section. Marks cannot exceed the section's max marks.
        - Provide brief feedback for each section.
        - Calculate the total obtained marks and percentage.

        Output Format:
        Return a valid JSON object with the following structure:
        {
            "sections": [
                {
                    "sectionName": "Section A",
                    "maxMarks": 10,
                    "obtainedMarks": 8,
                    "feedback": "Good understanding, missed one keyword."
                }
            ],
            "totalMarks": ${paperConfig.totalMarks},
            "obtainedMarks": 45,
            "percentage": 90,
            "grade": "A",
            "overallFeedback": "Excellent performance."
        }
        
        IMPORTANT: Return ONLY the JSON object. Do not include markdown code blocks or additional text.
        `;

        // Use a model capable of reasoning or high-quality instruction following
        // Using llama-3.3-70b-versatile or qwen-2.5-32b for good reasoning capabilities
        const model = 'llama-3.3-70b-versatile';

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: model,
            temperature: 0.1, // Low temperature for consistent grading
            max_completion_tokens: 2048,
            top_p: 1,
            stream: false,
            response_format: { type: 'json_object' } // Enforce JSON
        });

        const resultText = completion.choices[0]?.message?.content || '{}';
        logToFile('Groq evaluation complete.');

        return JSON.parse(resultText);

    } catch (error) {
        logToFile(`Groq Evaluation Error: ${error.message}`);
        console.error('Groq Evaluation Error:', error);
        throw error;
    }
};

export default {
    processFileWithGroq,
    evaluatePaperWithGroq
};
