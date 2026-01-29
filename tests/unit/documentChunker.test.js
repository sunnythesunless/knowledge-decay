/**
 * Document Chunker Unit Tests
 */

const { chunkDocument } = require('../../src/services/documentChunker');

describe('Document Chunker Service', () => {
    describe('chunkDocument', () => {
        it('should return empty array for empty content', () => {
            expect(chunkDocument('')).toEqual([]);
            expect(chunkDocument(null)).toEqual([]);
        });

        it('should split content into chunks', () => {
            const content = 'First sentence here. Second sentence follows. Third sentence now. Fourth one. Fifth sentence. Sixth here.';
            const chunks = chunkDocument(content, { chunkSize: 50, minChunkSize: 20 });

            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks[0]).toHaveProperty('chunkIndex');
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('startPosition');
            expect(chunks[0]).toHaveProperty('endPosition');
        });

        it('should maintain chunk index order', () => {
            const content = 'A. B. C. D. E. F. G. H. I. J.';
            const chunks = chunkDocument(content, { chunkSize: 10, minChunkSize: 5 });

            for (let i = 0; i < chunks.length; i++) {
                expect(chunks[i].chunkIndex).toBe(i);
            }
        });

        it('should respect minimum chunk size', () => {
            const content = 'Short. Very short.';
            const chunks = chunkDocument(content, { minChunkSize: 100 });

            // Should return empty if content is too short
            expect(chunks.length).toBeLessThanOrEqual(1);
        });

        it('should include start and end positions', () => {
            const content = 'First sentence. Second sentence. Third sentence.';
            const chunks = chunkDocument(content, { chunkSize: 30, minChunkSize: 10 });

            if (chunks.length > 0) {
                expect(chunks[0].startPosition).toBe(0);
                expect(chunks[0].endPosition).toBeGreaterThan(0);
            }
        });
    });
});
