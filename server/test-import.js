
import fs from 'fs';
const log = (msg) => {
    fs.appendFileSync('debug_test.txt', msg + '\n');
};

log('Starting test...');
try {
    log('Importing sharp...');
    await import('sharp');
    log('Sharp imported.');

    log('Importing tesseract.js...');
    await import('tesseract.js');
    log('Tesseract imported.');

    log('Importing pdf-poppler...');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const poppler = require('pdf-poppler');
    log('Pdf-poppler imported.');

    log('All imports success.');
} catch (e) {
    log('Import failed: ' + e.message + '\n' + e.stack);
}
