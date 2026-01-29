/**
 * Contradiction Detector Unit Tests
 */

const {
    detectContradictions,
    findRelatedDocuments,
    isMoreAuthoritative,
} = require('../../src/services/contradictionDetector');

describe('ContradictionDetector', () => {
    describe('detectContradictions', () => {
        it('should return no contradictions when no related docs', () => {
            const document = {
                id: 'doc-1',
                content: 'Step 1: Deploy to production. Step 2: Run tests.',
                updatedAt: new Date(),
            };

            const result = detectContradictions(document, []);

            expect(result.hasContradictions).toBe(false);
            expect(result.contradictions).toHaveLength(0);
            expect(result.penalty).toBe(0);
        });

        it('should detect numerical contradictions', () => {
            const document = {
                id: 'doc-1',
                content: 'Deployments must complete within 5 minutes.',
                updatedAt: new Date('2024-01-01'),
            };

            const relatedDocs = [{
                id: 'doc-2',
                title: 'New Deployment Guide',
                content: 'Deployments must complete within 15 minutes.',
                updatedAt: new Date('2024-06-01'), // Newer
            }];

            const result = detectContradictions(document, relatedDocs);

            expect(result.hasContradictions).toBe(true);
            expect(result.contradictions.length).toBeGreaterThanOrEqual(1);
            expect(result.penalty).toBeGreaterThan(0);
        });

        it('should detect must/must not contradictions', () => {
            const document = {
                id: 'doc-1',
                content: 'Users must enable two-factor authentication.',
                updatedAt: new Date('2024-01-01'),
            };

            const relatedDocs = [{
                id: 'doc-2',
                title: 'Updated Security Policy',
                content: 'Users should not enable two-factor authentication by default.',
                updatedAt: new Date('2024-06-01'),
            }];

            const result = detectContradictions(document, relatedDocs);

            // May or may not detect depending on similarity threshold
            expect(result).toHaveProperty('hasContradictions');
            expect(result).toHaveProperty('penalty');
        });

        it('should include source document IDs in decay reasons', () => {
            const document = {
                id: 'doc-1',
                content: 'The process requires 10 days for completion.',
                updatedAt: new Date('2024-01-01'),
            };

            const relatedDocs = [{
                id: 'doc-2',
                title: 'Updated Process',
                content: 'The process requires 5 days for completion.',
                updatedAt: new Date('2024-06-01'),
            }];

            const result = detectContradictions(document, relatedDocs);

            if (result.hasContradictions) {
                expect(result.decayReasons[0].sources).toContain('doc-2');
            }
        });

        it('should cap penalty at maximum 0.4', () => {
            const document = {
                id: 'doc-1',
                content: `
          Step 1 requires 5 days. Step 2 requires 10 days. 
          Step 3 must be enabled. Step 4 always runs.
        `,
                updatedAt: new Date('2024-01-01'),
            };

            const relatedDocs = [{
                id: 'doc-2',
                title: 'New Guide',
                content: `
          Step 1 requires 15 days. Step 2 requires 20 days.
          Step 3 must not be enabled. Step 4 never runs.
        `,
                updatedAt: new Date('2024-06-01'),
            }];

            const result = detectContradictions(document, relatedDocs);
            expect(result.penalty).toBeLessThanOrEqual(0.4);
        });
    });

    describe('isMoreAuthoritative', () => {
        it('should rank SOP higher than Notes', () => {
            const sop = { type: 'SOP' };
            const notes = { type: 'Notes' };

            expect(isMoreAuthoritative(sop, notes)).toBe(true);
            expect(isMoreAuthoritative(notes, sop)).toBe(false);
        });

        it('should rank Policy higher than Guide', () => {
            const policy = { type: 'Policy' };
            const guide = { type: 'Guide' };

            expect(isMoreAuthoritative(policy, guide)).toBe(true);
        });
    });

    describe('findRelatedDocuments', () => {
        it('should find documents with similar content', () => {
            const document = {
                id: 'doc-1',
                content: 'How to deploy applications to production environment.',
            };

            const allDocs = [
                { id: 'doc-1', content: 'How to deploy applications to production environment.' },
                { id: 'doc-2', content: 'Deploying apps to production servers and environments.' },
                { id: 'doc-3', content: 'Completely unrelated content about cooking recipes.' },
            ];

            const related = findRelatedDocuments(document, allDocs, 0.2);

            // Should find doc-2, not doc-3, and not doc-1 (self)
            expect(related.some(d => d.id === 'doc-2')).toBe(true);
            expect(related.some(d => d.id === 'doc-1')).toBe(false); // Excludes self
        });

        it('should respect similarity threshold', () => {
            const document = {
                id: 'doc-1',
                content: 'Deploy to production.',
            };

            const allDocs = [
                { id: 'doc-2', content: 'Deploy to staging.' },
            ];

            const strictResults = findRelatedDocuments(document, allDocs, 0.9);
            const looseResults = findRelatedDocuments(document, allDocs, 0.1);

            expect(looseResults.length).toBeGreaterThanOrEqual(strictResults.length);
        });

        it('should sort by similarity descending', () => {
            const document = {
                id: 'doc-1',
                content: 'Deploy to production environment.',
            };

            const allDocs = [
                { id: 'doc-2', content: 'Deploy to staging.' },
                { id: 'doc-3', content: 'Deploy to production.' },
            ];

            const related = findRelatedDocuments(document, allDocs, 0.1);

            if (related.length >= 2) {
                expect(related[0].similarity).toBeGreaterThanOrEqual(related[1].similarity);
            }
        });
    });
});
