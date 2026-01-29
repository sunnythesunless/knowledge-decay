/**
 * AI Summarizer Unit Tests
 */

const {
    generateBasicSummary,
    isAIAvailable,
} = require('../../src/services/aiSummarizer');

describe('AI Summarizer Service', () => {
    describe('generateBasicSummary', () => {
        it('should generate summary from first sentences', () => {
            const content = 'This is the first sentence. This is the second sentence. Third sentence here.';
            const result = generateBasicSummary(content);

            expect(result.summary).toBeTruthy();
            expect(result.aiGenerated).toBe(false);
        });

        it('should extract key points with action words', () => {
            const content = `
                Introduction paragraph here.
                Users must complete the training before starting.
                You should always backup your data.
                This is required for all employees.
                Final paragraph about the process.
            `;
            const result = generateBasicSummary(content);

            expect(result.keyPoints.length).toBeGreaterThan(0);
            expect(result.keyPoints.some(kp => kp.toLowerCase().includes('must'))).toBe(true);
        });

        it('should return empty topics array', () => {
            const content = 'Simple document content.';
            const result = generateBasicSummary(content);

            expect(Array.isArray(result.topics)).toBe(true);
            expect(result.topics).toHaveLength(0);
        });

        it('should handle empty content', () => {
            const result = generateBasicSummary('');

            expect(result.summary).toBeDefined();
            expect(result.keyPoints).toBeDefined();
            expect(result.aiGenerated).toBe(false);
        });

        it('should limit summary length', () => {
            const longContent = 'A'.repeat(1000) + '. ' + 'B'.repeat(1000) + '.';
            const result = generateBasicSummary(longContent);

            expect(result.summary.length).toBeLessThanOrEqual(501); // 500 + period
        });
    });

    describe('isAIAvailable', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            process.env = originalEnv;
        });

        it('should return true when GEMINI_API_KEY is set', () => {
            process.env.GEMINI_API_KEY = 'test-key';
            const { isAIAvailable } = require('../../src/services/aiSummarizer');
            expect(isAIAvailable()).toBe(true);
        });

        it('should return false when GEMINI_API_KEY is not set', () => {
            delete process.env.GEMINI_API_KEY;
            const { isAIAvailable } = require('../../src/services/aiSummarizer');
            expect(isAIAvailable()).toBe(false);
        });
    });
});
