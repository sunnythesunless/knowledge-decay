/**
 * Document Parser Service
 * 
 * Extracts text from PDF, DOCX, and plain text files.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Parse document and extract text content
 * @param {string} filePath - Path to the uploaded file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} Extracted content and metadata
 */
async function parseDocument(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === '.pdf' || mimeType === 'application/pdf') {
            return await parsePDF(filePath);
        }

        if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await parseDOCX(filePath);
        }

        if (ext === '.txt' || ext === '.md' || mimeType?.startsWith('text/')) {
            return await parseText(filePath);
        }

        throw new Error(`Unsupported file type: ${ext}`);
    } catch (error) {
        throw new Error(`Failed to parse document: ${error.message}`);
    }
}

/**
 * Parse PDF file
 */
async function parsePDF(filePath) {
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    return {
        content: data.text.trim(),
        metadata: {
            pageCount: data.numpages,
            info: data.info || {},
        },
    };
}

/**
 * Parse DOCX file
 */
async function parseDOCX(filePath) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    return {
        content: result.value.trim(),
        metadata: {
            warnings: result.messages,
        },
    };
}

/**
 * Parse plain text file
 */
async function parseText(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');

    return {
        content: content.trim(),
        metadata: {},
    };
}

/**
 * Get supported file extensions
 */
function getSupportedExtensions() {
    return ['.pdf', '.docx', '.txt', '.md'];
}

/**
 * Validate file type
 */
function isSupported(filename) {
    const ext = path.extname(filename).toLowerCase();
    return getSupportedExtensions().includes(ext);
}

/**
 * Get max file size (in bytes)
 */
function getMaxFileSize() {
    return 10 * 1024 * 1024; // 10MB
}

module.exports = {
    parseDocument,
    parsePDF,
    parseDOCX,
    parseText,
    getSupportedExtensions,
    isSupported,
    getMaxFileSize,
};
