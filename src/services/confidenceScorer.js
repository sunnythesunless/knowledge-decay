/**
 * Confidence Scorer Service
 * 
 * Calculates confidence score based on all decay signals.
 * Starts at 1.0 and applies penalties.
 * 
 * IMPORTANT: Logs breakdown for auditing as recommended.
 */

// Maximum penalties (from .env or defaults)
const MAX_AGE_PENALTY = parseFloat(process.env.WEIGHT_AGE_PENALTY) || 0.3;
const MAX_CONTRADICTION_PENALTY = parseFloat(process.env.WEIGHT_CONTRADICTION_PENALTY) || 0.4;
const MAX_DRIFT_PENALTY = parseFloat(process.env.WEIGHT_DRIFT_PENALTY) || 0.2;
const MAX_SUPPORT_PENALTY = parseFloat(process.env.WEIGHT_SUPPORT_PENALTY) || 0.1;

/**
 * Calculate confidence score with full breakdown
 * @param {Object} params - Scoring parameters
 * @param {number} params.agePenalty - Penalty from freshness evaluation
 * @param {number} params.contradictionPenalty - Penalty from contradiction detection
 * @param {number} params.driftPenalty - Penalty from version drift
 * @param {number} params.supportingDocsCount - Number of supporting documents
 * @returns {Object} Score and breakdown for auditing
 */
function calculateConfidence({
    agePenalty = 0,
    contradictionPenalty = 0,
    driftPenalty = 0,
    supportingDocsCount = 0,
}) {
    // Start with perfect confidence
    let confidence = 1.0;

    // Apply age penalty (capped at max)
    const appliedAgePenalty = Math.min(agePenalty, MAX_AGE_PENALTY);
    confidence -= appliedAgePenalty;

    // Apply contradiction penalty (capped at max)
    const appliedContradictionPenalty = Math.min(contradictionPenalty, MAX_CONTRADICTION_PENALTY);
    confidence -= appliedContradictionPenalty;

    // Apply drift penalty (capped at max)
    const appliedDriftPenalty = Math.min(driftPenalty, MAX_DRIFT_PENALTY);
    confidence -= appliedDriftPenalty;

    // Apply support penalty (fewer supporting docs = higher penalty)
    // 0 docs = full penalty, 3+ docs = no penalty
    let appliedSupportPenalty = 0;
    if (supportingDocsCount === 0) {
        appliedSupportPenalty = MAX_SUPPORT_PENALTY;
    } else if (supportingDocsCount < 3) {
        appliedSupportPenalty = MAX_SUPPORT_PENALTY * (1 - supportingDocsCount / 3);
    }
    confidence -= appliedSupportPenalty;

    // Ensure bounds
    confidence = Math.max(0.0, Math.min(1.0, confidence));

    // Round to 2 decimal places
    confidence = Math.round(confidence * 100) / 100;

    // Create breakdown for auditing (as recommended)
    const breakdown = {
        starting_confidence: 1.0,
        age_penalty: Math.round(appliedAgePenalty * 1000) / 1000,
        contradiction_penalty: Math.round(appliedContradictionPenalty * 1000) / 1000,
        drift_penalty: Math.round(appliedDriftPenalty * 1000) / 1000,
        support_penalty: Math.round(appliedSupportPenalty * 1000) / 1000,
        total_penalty: Math.round((1.0 - confidence) * 1000) / 1000,
        final_confidence: confidence,
    };

    return {
        confidence,
        breakdown,
    };
}

/**
 * Determine risk level based on confidence and signals
 * @param {number} confidence - Confidence score
 * @param {Object} signals - Decay signals
 * @returns {string} 'low' | 'medium' | 'high'
 */
function determineRiskLevel(confidence, signals = {}) {
    const { hasContradictions, hasSignificantDrift, freshnessStatus } = signals;

    // High risk: contradictions OR very low confidence
    if (hasContradictions || confidence < 0.4) {
        return 'high';
    }

    // Medium risk: significant drift OR warning freshness OR moderate confidence
    if (hasSignificantDrift || freshnessStatus === 'critical' || confidence < 0.7) {
        return 'medium';
    }

    // Low risk: minor staleness, no conflicts
    return 'low';
}

/**
 * Check if decay should be flagged
 * @param {number} confidence - Confidence score
 * @param {string} riskLevel - Risk level
 * @returns {boolean}
 */
function shouldFlagDecay(confidence, riskLevel) {
    // Flag if not perfect confidence
    // Conservative approach: when uncertain, flag for human review
    return confidence < 1.0 || riskLevel !== 'low';
}

module.exports = {
    calculateConfidence,
    determineRiskLevel,
    shouldFlagDecay,
    MAX_AGE_PENALTY,
    MAX_CONTRADICTION_PENALTY,
    MAX_DRIFT_PENALTY,
    MAX_SUPPORT_PENALTY,
};
