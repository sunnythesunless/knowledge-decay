/**
 * Freshness Evaluator Unit Tests
 */

const {
    evaluateFreshness,
    calculateAgeDays,
    getThresholds,
    DECAY_THRESHOLDS
} = require('../../src/services/freshnessEvaluator');

describe('FreshnessEvaluator', () => {
    describe('calculateAgeDays', () => {
        it('should calculate age in days correctly', () => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

            const age = calculateAgeDays(thirtyDaysAgo);
            expect(age).toBe(30);
        });

        it('should return 0 for today', () => {
            const now = new Date();
            const age = calculateAgeDays(now);
            expect(age).toBe(0);
        });
    });

    describe('getThresholds', () => {
        it('should return correct thresholds for SOP', () => {
            const thresholds = getThresholds('SOP');
            expect(thresholds.warning).toBe(30);
            expect(thresholds.critical).toBe(90);
        });

        it('should return correct thresholds for Policy', () => {
            const thresholds = getThresholds('Policy');
            expect(thresholds.warning).toBe(60);
            expect(thresholds.critical).toBe(180);
        });

        it('should return Notes thresholds for unknown types', () => {
            const thresholds = getThresholds('Unknown');
            expect(thresholds).toEqual(DECAY_THRESHOLDS.Notes);
        });
    });

    describe('evaluateFreshness', () => {
        it('should return fresh status for new document', () => {
            const document = {
                type: 'SOP',
                updatedAt: new Date(),
            };

            const result = evaluateFreshness(document);

            expect(result.status).toBe('fresh');
            expect(result.penalty).toBe(0);
            expect(result.decayReason).toBeNull();
        });

        it('should return warning status for document past warning threshold', () => {
            const now = new Date();
            const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);

            const document = {
                type: 'SOP', // warning at 30 days
                updatedAt: fortyDaysAgo,
            };

            const result = evaluateFreshness(document);

            expect(result.status).toBe('warning');
            expect(result.penalty).toBeGreaterThan(0.1);
            expect(result.penalty).toBeLessThan(0.3);
            expect(result.decayReason).not.toBeNull();
            expect(result.decayReason.type).toBe('time');
        });

        it('should return critical status for document past critical threshold', () => {
            const now = new Date();
            const hundredDaysAgo = new Date(now - 100 * 24 * 60 * 60 * 1000);

            const document = {
                type: 'SOP', // critical at 90 days
                updatedAt: hundredDaysAgo,
            };

            const result = evaluateFreshness(document);

            expect(result.status).toBe('critical');
            expect(result.penalty).toBe(0.3); // Max penalty
            expect(result.decayReason).not.toBeNull();
        });

        it('should use lastVerifiedAt if available over updatedAt', () => {
            const now = new Date();
            const hundredDaysAgo = new Date(now - 100 * 24 * 60 * 60 * 1000);

            const document = {
                type: 'SOP',
                updatedAt: hundredDaysAgo,
                lastVerifiedAt: new Date(), // Recently verified
            };

            const result = evaluateFreshness(document);

            expect(result.status).toBe('fresh');
            expect(result.penalty).toBe(0);
        });

        it('should apply different thresholds per document type', () => {
            const now = new Date();
            const fiftyDaysAgo = new Date(now - 50 * 24 * 60 * 60 * 1000);

            // SOP: warning at 30 days → should be warning
            const sopResult = evaluateFreshness({ type: 'SOP', updatedAt: fiftyDaysAgo });
            expect(sopResult.status).toBe('warning');

            // Policy: warning at 60 days → should be fresh
            const policyResult = evaluateFreshness({ type: 'Policy', updatedAt: fiftyDaysAgo });
            expect(policyResult.status).toBe('fresh');

            // Notes: warning at 180 days → should be fresh
            const notesResult = evaluateFreshness({ type: 'Notes', updatedAt: fiftyDaysAgo });
            expect(notesResult.status).toBe('fresh');
        });
    });
});
