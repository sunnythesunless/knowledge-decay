/**
 * Decay Engine Service
 * 
 * Main orchestrator for decay detection.
 * Combines all detection modules and produces structured output.
 * 
 * This is the core of the InsightOps system.
 */

const { evaluateFreshness } = require('./freshnessEvaluator');
const { detectContradictions, findRelatedDocuments } = require('./contradictionDetector');
const { analyzeVersionDrift } = require('./versionDriftAnalyzer');
const { calculateConfidence, determineRiskLevel, shouldFlagDecay } = require('./confidenceScorer');
const { generateUpdateRecommendations } = require('./updateGenerator');
const { getEmbedding } = require('../utils/vectorUtils');

/**
 * Analyze a document for decay
 * @param {Object} params - Analysis parameters
 * @param {Object} params.document - Document to analyze
 * @param {Array<Object>} params.versions - Previous versions of the document
 * @param {Array<Object>} params.relatedDocs - Related documents for contradiction check
 * @param {Array<Object>} params.allDocs - All workspace documents (optional, for auto-finding related)
 * @returns {Object} Decay analysis result in required format
 */
async function analyzeDocument({
    document,
    versions = [],
    relatedDocs = [],
    allDocs = [],
}) {
    // Ensure document has embedding
    if (!document.embedding) {
        document.embedding = await getEmbedding(document.content);
    }

    // Auto-find related documents if not provided
    if (relatedDocs.length === 0 && allDocs.length > 0) {
        relatedDocs = findRelatedDocuments(document, allDocs);
    }

    // 1. Evaluate freshness (time-based)
    const freshnessResult = evaluateFreshness(document);

    // 2. Detect contradictions
    const contradictionResult = detectContradictions(document, relatedDocs);

    // 3. Analyze version drift
    const driftResult = analyzeVersionDrift(document, versions);

    // 4. Calculate confidence score with breakdown
    const { confidence, breakdown } = calculateConfidence({
        agePenalty: freshnessResult.penalty,
        contradictionPenalty: contradictionResult.penalty,
        driftPenalty: driftResult.penalty,
        supportingDocsCount: relatedDocs.length,
    });

    // 5. Determine risk level
    const riskLevel = determineRiskLevel(confidence, {
        hasContradictions: contradictionResult.hasContradictions,
        hasSignificantDrift: driftResult.hasSignificantDrift,
        freshnessStatus: freshnessResult.status,
    });

    // 6. Compile decay reasons
    const decayReasons = [];

    if (freshnessResult.decayReason) {
        decayReasons.push(freshnessResult.decayReason);
    }

    if (contradictionResult.decayReasons) {
        decayReasons.push(...contradictionResult.decayReasons);
    }

    if (driftResult.decayReason) {
        decayReasons.push(driftResult.decayReason);
    }

    // Add low support reason if applicable
    if (relatedDocs.length === 0 && breakdown.support_penalty > 0) {
        decayReasons.push({
            type: 'low_support',
            description: 'No supporting documents found for cross-validation',
            sources: [],
        });
    }

    // 7. Determine if decay detected
    const decayDetected = shouldFlagDecay(confidence, riskLevel);

    // 8. Generate update recommendations if decay detected
    let updateResult = {
        recommendations: [],
        whatChangedSummary: 'No decay signals detected.',
    };

    if (decayDetected) {
        updateResult = generateUpdateRecommendations(
            document,
            { decayReasons },
            relatedDocs.filter(d => new Date(d.updatedAt) > new Date(document.updatedAt))
        );
    }

    // 9. Collect citations (all related doc IDs)
    const citations = [
        ...new Set([
            ...decayReasons.flatMap(r => r.sources || []),
            ...relatedDocs.map(d => d.id),
        ])
    ].filter(Boolean);

    // 10. Build final output in REQUIRED format
    return {
        decay_detected: decayDetected,
        confidence_score: confidence,
        risk_level: riskLevel,
        decay_reasons: decayReasons,
        what_changed_summary: updateResult.whatChangedSummary,
        update_recommendations: updateResult.recommendations.map(r => ({
            section: r.section,
            suggested_text: r.suggested_text,
        })),
        citations,
        // Internal fields for storage (not exposed in API)
        _internal: {
            confidence_breakdown: breakdown,
            freshness: {
                status: freshnessResult.status,
                age_days: freshnessResult.ageDays,
            },
            contradictions: contradictionResult.contradictions,
            drift: {
                score: driftResult.driftScore,
                has_significant_drift: driftResult.hasSignificantDrift,
            },
        },
    };
}

/**
 * Batch analyze multiple documents
 * @param {Array<Object>} documents - Documents to analyze
 * @param {Array<Object>} allDocs - All workspace documents
 * @returns {Array<Object>} Analysis results
 */
async function batchAnalyze(documents, allDocs = []) {
    const results = [];

    for (const document of documents) {
        try {
            // Get versions for this document
            const versions = document.versions || [];

            // Analyze
            const result = await analyzeDocument({
                document,
                versions,
                allDocs,
            });

            results.push({
                documentId: document.id,
                documentTitle: document.title,
                ...result,
            });
        } catch (error) {
            results.push({
                documentId: document.id,
                documentTitle: document.title,
                error: error.message,
                decay_detected: false,
                confidence_score: 0,
                risk_level: 'high',
                decay_reasons: [{
                    type: 'error',
                    description: `Analysis failed: ${error.message}`,
                    sources: [],
                }],
            });
        }
    }

    return results;
}

module.exports = {
    analyzeDocument,
    batchAnalyze,
};
