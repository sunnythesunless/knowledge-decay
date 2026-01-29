/**
 * Document Parser Unit Tests
 */

const path = require('path');
const fs = require('fs').promises;
const {
    parseDocument,
    parseText,
    isSupported,
    getSupportedExtensions,
    getMaxFileSize,
} = require('../../src/services/documentParser');

describe('Document Parser Service', () => {
    const testDir = path.join(__dirname, '../fixtures');

    beforeAll(async () => {
        // Create test fixtures directory
        await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
        // Clean up test fixtures
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('isSupported', () => {
        it('should return true for PDF files', () => {
            expect(isSupported('document.pdf')).toBe(true);
            expect(isSupported('DOCUMENT.PDF')).toBe(true);
        });

        it('should return true for DOCX files', () => {
            expect(isSupported('document.docx')).toBe(true);
        });

        it('should return true for TXT files', () => {
            expect(isSupported('document.txt')).toBe(true);
        });

        it('should return true for MD files', () => {
            expect(isSupported('README.md')).toBe(true);
        });

        it('should return false for unsupported files', () => {
            expect(isSupported('image.jpg')).toBe(false);
            expect(isSupported('video.mp4')).toBe(false);
            expect(isSupported('archive.zip')).toBe(false);
        });
    });

    describe('getSupportedExtensions', () => {
        it('should return array of supported extensions', () => {
            const extensions = getSupportedExtensions();
            expect(Array.isArray(extensions)).toBe(true);
            expect(extensions).toContain('.pdf');
            expect(extensions).toContain('.docx');
            expect(extensions).toContain('.txt');
            expect(extensions).toContain('.md');
        });
    });

    describe('getMaxFileSize', () => {
        it('should return max file size in bytes', () => {
            const maxSize = getMaxFileSize();
            expect(typeof maxSize).toBe('number');
            expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
        });
    });

    describe('parseText', () => {
        it('should parse plain text files', async () => {
            const testFile = path.join(testDir, 'test.txt');
            await fs.writeFile(testFile, 'This is test content.\nLine 2.');

            const result = await parseText(testFile);

            expect(result.content).toBe('This is test content.\nLine 2.');
            expect(result.metadata).toEqual({});
        });

        it('should trim whitespace from content', async () => {
            const testFile = path.join(testDir, 'test-whitespace.txt');
            await fs.writeFile(testFile, '   Content with spaces   \n\n');

            const result = await parseText(testFile);

            expect(result.content).toBe('Content with spaces');
        });
    });

    describe('parseDocument', () => {
        it('should parse TXT files by extension', async () => {
            const testFile = path.join(testDir, 'doc.txt');
            await fs.writeFile(testFile, 'Test document content');

            const result = await parseDocument(testFile, 'text/plain');

            expect(result.content).toBe('Test document content');
        });

        it('should parse MD files', async () => {
            const testFile = path.join(testDir, 'doc.md');
            await fs.writeFile(testFile, '# Heading\n\nParagraph text.');

            const result = await parseDocument(testFile, 'text/markdown');

            expect(result.content).toBe('# Heading\n\nParagraph text.');
        });

        it('should throw for unsupported file types', async () => {
            const testFile = path.join(testDir, 'doc.xyz');
            await fs.writeFile(testFile, 'content');

            await expect(parseDocument(testFile, 'application/octet-stream'))
                .rejects.toThrow('Unsupported file type');
        });
    });
});
