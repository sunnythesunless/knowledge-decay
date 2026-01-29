/**
 * RAG Engine Unit Tests
 */

const {
    askQuestion,
    generateBasicAnswer,
    isRAGAvailable,
} = require('../../src/services/ragEngine');

// Mock dependencies
jest.mock('../../src/services/vectorSearch', () => ({
    findRelevantContext: jest.fn(),
}));

const { findRelevantContext } = require('../../src/services/vectorSearch');

describe('RAG Engine Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isRAGAvailable', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should return true when GEMINI_API_KEY is set', () => {
            process.env.GEMINI_API_KEY = 'test-key';
            const { isRAGAvailable } = require('../../src/services/ragEngine');
            expect(isRAGAvailable()).toBe(true);
        });

        it('should return false when GEMINI_API_KEY is not set', () => {
            delete process.env.GEMINI_API_KEY;
            const { isRAGAvailable } = require('../../src/services/ragEngine');
            expect(isRAGAvailable()).toBe(false);
        });
    });

    describe('generateBasicAnswer', () => {
        it('should return no documents found when sources is empty', () => {
            const result = generateBasicAnswer('test question', []);

            expect(result.answer).toBe('No relevant documents found.');
            expect(result.confidence).toBe(0);
            expect(result.sources).toEqual([]);
        });

        it('should generate answer from top source', () => {
            const sources = [
                { title: 'Test Doc', excerpt: 'Some content here', similarity: 0.85 },
                { title: 'Other Doc', excerpt: 'Other content', similarity: 0.65 },
            ];

            const result = generateBasicAnswer('question', sources);

            expect(result.answer).toContain('Test Doc');
            expect(result.confidence).toBe(0.85);
            expect(result.sources).toHaveLength(2);
        });

        it('should include basic_mode warning', () => {
            const sources = [{ title: 'Doc', excerpt: 'Content', similarity: 0.8 }];

            const result = generateBasicAnswer('question', sources);

            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('basic_mode');
        });

        it('should limit sources to top 3', () => {
            const sources = [
                { title: 'Doc1', excerpt: 'Content', similarity: 0.9 },
                { title: 'Doc2', excerpt: 'Content', similarity: 0.8 },
                { title: 'Doc3', excerpt: 'Content', similarity: 0.7 },
                { title: 'Doc4', excerpt: 'Content', similarity: 0.6 },
            ];

            const result = generateBasicAnswer('question', sources);

            expect(result.sources).toHaveLength(3);
        });
    });

    describe('askQuestion', () => {
        it('should return no documents message when no context found', async () => {
            findRelevantContext.mockResolvedValue({ context: '', sources: [] });

            const result = await askQuestion('What is the process?', 'ws-001');

            expect(result.answer).toContain("couldn't find any relevant documents");
            expect(result.confidence).toBe(0);
            expect(result.sources).toEqual([]);
        });

        it('should call findRelevantContext with correct params', async () => {
            findRelevantContext.mockResolvedValue({
                context: 'Some context',
                sources: [{ title: 'Doc', similarity: 0.8 }],
            });

            await askQuestion('What is deployment?', 'ws-001');

            expect(findRelevantContext).toHaveBeenCalledWith('What is deployment?', 'ws-001');
        });

        it('should return basic answer when Gemini not available', async () => {
            delete process.env.GEMINI_API_KEY;

            findRelevantContext.mockResolvedValue({
                context: 'Some context',
                sources: [{ title: 'Test Doc', excerpt: 'Content', similarity: 0.85 }],
            });

            const result = await askQuestion('question', 'ws-001');

            expect(result.answer).toContain('Test Doc');
            expect(result.warnings.some(w => w.type === 'basic_mode')).toBe(true);
        });
    });
});
