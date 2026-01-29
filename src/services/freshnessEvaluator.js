/**
 * Freshness Evaluator Service
 * 
 * Evaluates document freshness based on time-based rules.
 * Different document types decay at different rates.
 */

// Document type decay thresholds (in days)
const DECAY_THRESHOLDS = {
    SOP: { warning: 30, critical: 90 },
    Policy: { warning: 60, critical: 180 },
    Guide: { warning: 90, critical: 365 },
    Spec: { warning: 45, critical: 120 },
    Notes: { warning: 180, critical: 365 },
};

/**
 * Calculate the age of a document in days
 * @param {Date} updatedAt - Last update timestamp
 * @returns {number} Age in days
 */
function calculateAgeDays(updatedAt) {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now - updated;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluate document freshness
 * @param {Object} document - Document with type and updatedAt
 * @returns {Object} Freshness evaluation result
 */
function evaluateFreshness(document) {
    const { type, updatedAt, lastVerifiedAt } = document;
    const thresholds = DECAY_THRESHOLDS[type] || DECAY_THRESHOLDS.Notes;

    // Use lastVerifiedAt if available, otherwise updatedAt
    const referenceDate = lastVerifiedAt || updatedAt;
    const ageDays = calculateAgeDays(referenceDate);

    // Calculate freshness status
    let status = 'fresh';
    let penalty = 0;
    let decayReason = null;

    if (ageDays >= thresholds.critical) {
        status = 'critical';
        penalty = 0.3; // Maximum age penalty
        decayReason = {
            type: 'time',
            description: `Document last updated ${ageDays} days ago (${type} critical threshold: ${thresholds.critical} days)`,
            sources: [],
        };
    } else if (ageDays >= thresholds.warning) {
        status = 'warning';
        // Linear penalty between warning and critical
        const range = thresholds.critical - thresholds.warning;
        const overWarning = ageDays - thresholds.warning;
        penalty = 0.1 + (0.2 * (overWarning / range));
        decayReason = {
            type: 'time',
            description: `Document last updated ${ageDays} days ago (${type} warning threshold: ${thresholds.warning} days)`,
            sources: [],
        };
    }

    return {
        status,
        ageDays,
        thresholds,
        penalty: Math.round(penalty * 1000) / 1000,
        decayReason,
    };
}

/**
 * Get thresholds for a document type
 * @param {string} type - Document type
 * @returns {Object} { warning, critical } thresholds
 */
function getThresholds(type) {
    return DECAY_THRESHOLDS[type] || DECAY_THRESHOLDS.Notes;
}

module.exports = {
    evaluateFreshness,
    calculateAgeDays,
    getThresholds,
    DECAY_THRESHOLDS,
};
