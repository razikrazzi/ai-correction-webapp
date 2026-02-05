
import { processFileWithGroq } from './src/services/groqService.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const testFile = process.argv[2];

if (!testFile) {
    console.log('Usage: node test-groq.js <path-to-image-or-pdf>');
    process.exit(1);
}

const run = async () => {
    try {
        console.log(`Processing ${testFile}...`);
        const result = await processFileWithGroq(path.resolve(testFile));
        console.log('\n--- Extraction Result ---');
        console.log(result.extractedText);
        console.log('\n--- Metadata ---');
        console.log('Word Count:', result.wordCount);
        console.log('Confidence:', result.confidence);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

run();
