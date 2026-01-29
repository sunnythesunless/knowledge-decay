/**
 * Vector Search Unit Tests
 */

const { searchDocuments, findRelevantContext } = require('../../src/services/vectorSearch');

// Mock dependencies
jest.mock('../../src/models', () => ({
    Document: {
        findAll: jest.fn(),
    },
}));

jest.mock('../../src/utils/vectorUtils', () => ({
    getEmbedding: jest.fn(),
    calculateSimilarity: jest.fn(),
}));

const { Document } = require('../../src/models');
const { getEmbedding, calculateSimilarity } = require('../../src/utils/vectorUtils');

describe('Vector Search Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchDocuments', () => {
        it('should return empty array when no documents found', async () => {
            Document.findAll.mockResolvedValue([]);
            getEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

            const results = await searchDocuments('test query', 'ws-001');

            expect(results).toEqual([]);
        });

        it('should calculate similarity for documents with embeddings', async () => {
            const mockDocs = [
                {
                    id: 'doc-1',
                    title: 'Deployment Guide',
                    type: 'Guide',
                    content: 'This is about deployment procedures and best practices',
                    embedding: [0.1, 0.2, 0.3],
                    updatedAt: new Date(),
                },
            ];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
            calculateSimilarity.mockReturnValue(0.85);

            const results = await searchDocuments('deployment', 'ws-001');

            expect(getEmbedding).toHaveBeenCalledWith('deployment');
            expect(calculateSimilarity).toHaveBeenCalled();
            expect(results).toHaveLength(1);
            expect(results[0].similarity).toBe(0.85);
        });

        it('should filter out documents without embeddings', async () => {
            const mockDocs = [
                { id: 'doc-1', title: 'Doc1', content: 'Content', embedding: [0.1, 0.2], updatedAt: new Date() },
                { id: 'doc-2', title: 'Doc2', content: 'Content', embedding: null, updatedAt: new Date() },
            ];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1, 0.2]);
            calculateSimilarity.mockReturnValue(0.75);

            const results = await searchDocuments('query', 'ws-001');

            expect(results).toHaveLength(1);
            expect(results[0].documentId).toBe('doc-1');
        });

        it('should sort results by similarity descending', async () => {
            const mockDocs = [
                { id: 'doc-1', title: 'Low', content: 'Content', embedding: [0.1], updatedAt: new Date() },
                { id: 'doc-2', title: 'High', content: 'Content', embedding: [0.2], updatedAt: new Date() },
                { id: 'doc-3', title: 'Medium', content: 'Content', embedding: [0.3], updatedAt: new Date() },
            ];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity
                .mockReturnValueOnce(0.5)
                .mockReturnValueOnce(0.9)
                .mockReturnValueOnce(0.7);

            const results = await searchDocuments('query', 'ws-001');

            expect(results[0].similarity).toBe(0.9);
            expect(results[1].similarity).toBe(0.7);
            expect(results[2].similarity).toBe(0.5);
        });

        it('should filter out results below threshold', async () => {
            const mockDocs = [
                { id: 'doc-1', title: 'Doc', content: 'Content', embedding: [0.1], updatedAt: new Date() },
            ];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity.mockReturnValue(0.05); // Below 0.1 threshold

            const results = await searchDocuments('query', 'ws-001');

            expect(results).toEqual([]);
        });

        it('should limit results to topK', async () => {
            const mockDocs = Array.from({ length: 10 }, (_, i) => ({
                id: `doc-${i}`,
                title: `Doc ${i}`,
                content: 'Content',
                embedding: [0.1],
                updatedAt: new Date(),
            }));

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity.mockReturnValue(0.8);

            const results = await searchDocuments('query', 'ws-001', 3);

            expect(results).toHaveLength(3);
        });

        it('should include excerpt in results', async () => {
            const longContent = 'A'.repeat(500);
            const mockDocs = [{
                id: 'doc-1',
                title: 'Doc',
                content: longContent,
                embedding: [0.1],
                updatedAt: new Date(),
            }];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity.mockReturnValue(0.8);

            const results = await searchDocuments('query', 'ws-001');

            expect(results[0].excerpt.length).toBeLessThanOrEqual(304); // 300 + '...'
        });
    });

    describe('findRelevantContext', () => {
        it('should return empty context when no documents found', async () => {
            Document.findAll.mockResolvedValue([]);
            getEmbedding.mockResolvedValue([0.1]);

            const result = await findRelevantContext('question', 'ws-001');

            expect(result.context).toBe('');
            expect(result.sources).toEqual([]);
        });

        it('should build context from top documents', async () => {
            const mockDocs = [
                { id: 'doc-1', title: 'Doc1', content: 'First doc content', embedding: [0.1], updatedAt: new Date() },
                { id: 'doc-2', title: 'Doc2', content: 'Second doc content', embedding: [0.2], updatedAt: new Date() },
            ];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity.mockReturnValue(0.8);

            const result = await findRelevantContext('question', 'ws-001');

            expect(result.context).toContain('[Source 1: Doc1]');
            expect(result.context).toContain('[Source 2: Doc2]');
            expect(result.sources).toHaveLength(2);
        });

        it('should include source metadata', async () => {
            const updatedAt = new Date();
            const mockDocs = [{
                id: 'doc-1',
                title: 'Test Doc',
                type: 'SOP',
                content: 'Content here',
                embedding: [0.1],
                updatedAt,
            }];

            Document.findAll.mockResolvedValue(mockDocs);
            getEmbedding.mockResolvedValue([0.1]);
            calculateSimilarity.mockReturnValue(0.85);

            const result = await findRelevantContext('question', 'ws-001');

            expect(result.sources[0]).toMatchObject({
                documentId: 'doc-1',
                title: 'Test Doc',
                type: 'SOP',
                similarity: 0.85,
            });
        });
    });
});
