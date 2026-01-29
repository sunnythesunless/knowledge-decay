/**
 * Decay Engine Integration Tests
 */

const { analyzeDocument, batchAnalyze } = require('../../src/services/decayEngine');

describe('DecayEngine', () => {
    describe('analyzeDocument', () => {
        it('should return correct output format', async () => {
            const document = {
                id: 'test-doc-1',
                title: 'Test Document',
                type: 'SOP',
                content: 'This is a test SOP document.',
                currentVersion: 1,
                updatedAt: new Date(),
                createdAt: new Date(),
            };

            const result = await analyzeDocument({ document });

            // Check required fields
            expect(result).toHaveProperty('decay_detected');
            expect(result).toHaveProperty('confidence_score');
            expect(result).toHaveProperty('risk_level');
            expect(result).toHaveProperty('decay_reasons');
            expect(result).toHaveProperty('what_changed_summary');
            expect(result).toHaveProperty('update_recommendations');
            expect(result).toHaveProperty('citations');

            // Check types
            expect(typeof result.decay_detected).toBe('boolean');
            expect(typeof result.confidence_score).toBe('number');
            expect(['low', 'medium', 'high']).toContain(result.risk_level);
            expect(Array.isArray(result.decay_reasons)).toBe(true);
            expect(Array.isArray(result.update_recommendations)).toBe(true);
            expect(Array.isArray(result.citations)).toBe(true);
        });

        it('should return confidence between 0.0 and 1.0', async () => {
            const document = {
                id: 'test-doc-2',
                title: 'Test Document',
                type: 'Notes',
                content: 'Some content.',
                currentVersion: 1,
                updatedAt: new Date(),
            };

            const result = await analyzeDocument({ document });

            expect(result.confidence_score).toBeGreaterThanOrEqual(0.0);
            expect(result.confidence_score).toBeLessThanOrEqual(1.0);
        });

        it('should detect decay for old documents', async () => {
            const now = new Date();
            const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);

            const document = {
                id: 'test-doc-3',
                title: 'Old SOP',
                type: 'SOP', // Decays faster
                content: 'Old SOP content.',
                currentVersion: 1,
                updatedAt: sixMonthsAgo,
            };

            const result = await analyzeDocument({ document });

            expect(result.decay_detected).toBe(true);
            expect(result.confidence_score).toBeLessThan(1.0);
            expect(result.decay_reasons.some(r => r.type === 'time')).toBe(true);
        });

        it('should not detect decay for fresh documents', async () => {
            const document = {
                id: 'test-doc-4',
                title: 'Fresh Document',
                type: 'Notes',
                content: 'Fresh content just added today.',
                currentVersion: 1,
                updatedAt: new Date(),
            };

            const result = await analyzeDocument({
                document,
                relatedDocs: [{ id: 'support-1', content: 'Supporting doc', updatedAt: new Date() }],
            });

            // Should have high confidence even if not 1.0
            expect(result.confidence_score).toBeGreaterThan(0.8);
        });

        it('should include internal breakdown for auditing', async () => {
            const document = {
                id: 'test-doc-5',
                title: 'Test',
                type: 'Guide',
                content: 'Guide content.',
                currentVersion: 1,
                updatedAt: new Date(),
            };

            const result = await analyzeDocument({ document });

            expect(result._internal).toBeDefined();
            expect(result._internal.confidence_breakdown).toBeDefined();
            expect(result._internal.freshness).toBeDefined();
        });

        it('should analyze version drift when versions provided', async () => {
            const document = {
                id: 'test-doc-6',
                title: 'Versioned Doc',
                type: 'Spec',
                content: 'Completely new content that is very different from before.',
                currentVersion: 2,
                updatedAt: new Date(),
            };

            const versions = [{
                versionNumber: 1,
                content: 'Original content that was here initially.',
                createdAt: new Date('2024-01-01'),
            }];

            const result = await analyzeDocument({ document, versions });

            expect(result._internal.drift).toBeDefined();
            expect(typeof result._internal.drift.score).toBe('number');
        });

        it('should generate update recommendations when decay detected', async () => {
            const now = new Date();
            const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

            const document = {
                id: 'test-doc-7',
                title: 'Very Old Document',
                type: 'SOP',
                content: 'This SOP is very old and needs review.',
                currentVersion: 1,
                updatedAt: yearAgo,
            };

            const result = await analyzeDocument({ document });

            expect(result.decay_detected).toBe(true);
            expect(result.update_recommendations.length).toBeGreaterThan(0);
            expect(result.what_changed_summary).toBeTruthy();
        });
    });

    describe('batchAnalyze', () => {
        it('should analyze multiple documents', async () => {
            const documents = [
                {
                    id: 'batch-1',
                    title: 'Doc 1',
                    type: 'Notes',
                    content: 'Content 1',
                    currentVersion: 1,
                    updatedAt: new Date(),
                },
                {
                    id: 'batch-2',
                    title: 'Doc 2',
                    type: 'SOP',
                    content: 'Content 2',
                    currentVersion: 1,
                    updatedAt: new Date(),
                },
            ];

            const results = await batchAnalyze(documents);

            expect(results).toHaveLength(2);
            expect(results[0].documentId).toBe('batch-1');
            expect(results[1].documentId).toBe('batch-2');
        });

        it('should handle errors gracefully', async () => {
            const documents = [
                {
                    id: 'batch-3',
                    title: 'Good Doc',
                    type: 'Notes',
                    content: 'Content',
                    currentVersion: 1,
                    updatedAt: new Date(),
                },
                {
                    id: 'batch-4',
                    // Missing required fields - should error
                    content: null,
                },
            ];

            const results = await batchAnalyze(documents);

            expect(results).toHaveLength(2);
            // First should succeed
            expect(results[0].decay_detected).toBeDefined();
            // Second might have error
        });
    });
});
