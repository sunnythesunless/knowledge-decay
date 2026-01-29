/**
 * Confidence Scorer Unit Tests
 */

const {
    calculateConfidence,
    determineRiskLevel,
    shouldFlagDecay,
    MAX_AGE_PENALTY,
    MAX_CONTRADICTION_PENALTY,
} = require('../../src/services/confidenceScorer');

describe('ConfidenceScorer', () => {
    describe('calculateConfidence', () => {
        it('should start with confidence of 1.0 with no penalties', () => {
            const result = calculateConfidence({
                agePenalty: 0,
                contradictionPenalty: 0,
                driftPenalty: 0,
                supportingDocsCount: 5,
            });

            expect(result.confidence).toBe(1.0);
            expect(result.breakdown.final_confidence).toBe(1.0);
        });

        it('should reduce confidence based on age penalty', () => {
            const result = calculateConfidence({
                agePenalty: 0.2,
                contradictionPenalty: 0,
                driftPenalty: 0,
                supportingDocsCount: 5,
            });

            expect(result.confidence).toBe(0.8);
            expect(result.breakdown.age_penalty).toBe(0.2);
        });

        it('should reduce confidence based on contradiction penalty', () => {
            const result = calculateConfidence({
                agePenalty: 0,
                contradictionPenalty: 0.3,
                driftPenalty: 0,
                supportingDocsCount: 5,
            });

            expect(result.confidence).toBe(0.7);
            expect(result.breakdown.contradiction_penalty).toBe(0.3);
        });

        it('should apply all penalties cumulatively', () => {
            const result = calculateConfidence({
                agePenalty: 0.1,
                contradictionPenalty: 0.2,
                driftPenalty: 0.1,
                supportingDocsCount: 0, // adds 0.1 support penalty
            });

            // 1.0 - 0.1 - 0.2 - 0.1 - 0.1 = 0.5
            expect(result.confidence).toBe(0.5);
        });

        it('should cap penalties at their maximum values', () => {
            const result = calculateConfidence({
                agePenalty: 1.0, // exceeds max of 0.3
                contradictionPenalty: 1.0, // exceeds max of 0.4
                driftPenalty: 0,
                supportingDocsCount: 5,
            });

            // Should use max values, not 1.0
            expect(result.breakdown.age_penalty).toBe(MAX_AGE_PENALTY);
            expect(result.breakdown.contradiction_penalty).toBe(MAX_CONTRADICTION_PENALTY);
        });

        it('should never go below 0.0', () => {
            const result = calculateConfidence({
                agePenalty: 0.3,
                contradictionPenalty: 0.4,
                driftPenalty: 0.2,
                supportingDocsCount: 0, // adds 0.1
            });

            // Total penalty would be 1.0, so confidence = 0.0
            expect(result.confidence).toBe(0.0);
            expect(result.confidence).toBeGreaterThanOrEqual(0.0);
        });

        it('should never exceed 1.0', () => {
            const result = calculateConfidence({
                agePenalty: -0.5, // negative penalty shouldn't boost above 1.0
                contradictionPenalty: 0,
                driftPenalty: 0,
                supportingDocsCount: 10,
            });

            expect(result.confidence).toBeLessThanOrEqual(1.0);
        });

        it('should log full breakdown for auditing', () => {
            const result = calculateConfidence({
                agePenalty: 0.15,
                contradictionPenalty: 0.25,
                driftPenalty: 0.1,
                supportingDocsCount: 1,
            });

            expect(result.breakdown).toHaveProperty('starting_confidence');
            expect(result.breakdown).toHaveProperty('age_penalty');
            expect(result.breakdown).toHaveProperty('contradiction_penalty');
            expect(result.breakdown).toHaveProperty('drift_penalty');
            expect(result.breakdown).toHaveProperty('support_penalty');
            expect(result.breakdown).toHaveProperty('total_penalty');
            expect(result.breakdown).toHaveProperty('final_confidence');
        });

        it('should apply support penalty based on supporting docs count', () => {
            // 0 docs = full penalty
            const result0 = calculateConfidence({ supportingDocsCount: 0 });
            expect(result0.breakdown.support_penalty).toBe(0.1);

            // 1 doc = 2/3 penalty
            const result1 = calculateConfidence({ supportingDocsCount: 1 });
            expect(result1.breakdown.support_penalty).toBeCloseTo(0.067, 2);

            // 3+ docs = no penalty
            const result3 = calculateConfidence({ supportingDocsCount: 3 });
            expect(result3.breakdown.support_penalty).toBe(0);
        });
    });

    describe('determineRiskLevel', () => {
        it('should return high risk when contradictions exist', () => {
            const risk = determineRiskLevel(0.8, { hasContradictions: true });
            expect(risk).toBe('high');
        });

        it('should return high risk when confidence is very low', () => {
            const risk = determineRiskLevel(0.3, {});
            expect(risk).toBe('high');
        });

        it('should return medium risk for significant drift', () => {
            const risk = determineRiskLevel(0.7, { hasSignificantDrift: true });
            expect(risk).toBe('medium');
        });

        it('should return medium risk for critical freshness', () => {
            const risk = determineRiskLevel(0.7, { freshnessStatus: 'critical' });
            expect(risk).toBe('medium');
        });

        it('should return low risk for healthy documents', () => {
            const risk = determineRiskLevel(0.9, {
                hasContradictions: false,
                hasSignificantDrift: false,
                freshnessStatus: 'fresh',
            });
            expect(risk).toBe('low');
        });
    });

    describe('shouldFlagDecay', () => {
        it('should flag decay when confidence is less than 1.0', () => {
            expect(shouldFlagDecay(0.99, 'low')).toBe(true);
        });

        it('should flag decay when risk is not low', () => {
            expect(shouldFlagDecay(1.0, 'medium')).toBe(true);
            expect(shouldFlagDecay(1.0, 'high')).toBe(true);
        });

        it('should not flag decay for perfect document', () => {
            expect(shouldFlagDecay(1.0, 'low')).toBe(false);
        });
    });
});
