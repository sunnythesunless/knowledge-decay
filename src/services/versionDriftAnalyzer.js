/**
 * Version Drift Analyzer Service
 * 
 * Detects significant semantic changes between document versions.
 * Marks older versions as historical when meaning changes significantly.
 */

const { calculateSemanticDifference, generateTfIdfEmbedding } = require('../utils/textAnalysis');

// Threshold for significant drift (semantic difference > 0.4 = significant)
const SIGNIFICANT_DRIFT_THRESHOLD = 0.4;
const MODERATE_DRIFT_THRESHOLD = 0.25;

/**
 * Analyze version drift for a document
 * @param {Object} document - Current document
 * @param {Array<Object>} versions - Previous versions (ordered by version number desc)
 * @returns {Object} Drift analysis result
 */
function analyzeVersionDrift(document, versions) {
    if (!versions || versions.length === 0) {
        return {
            hasDrift: false,
            driftScore: 0,
            penalty: 0,
            changes: [],
            decayReason: null,
        };
    }

    const currentContent = document.content;
    const currentEmbedding = document.embedding || generateTfIdfEmbedding(currentContent);

    const changes = [];
    let maxDrift = 0;

    // Compare with each previous version
    for (const version of versions) {
        const versionEmbedding = version.embedding || generateTfIdfEmbedding(version.content);
        const drift = calculateSemanticDifference(currentContent, version.content);

        if (drift > maxDrift) {
            maxDrift = drift;
        }

        if (drift >= MODERATE_DRIFT_THRESHOLD) {
            changes.push({
                fromVersion: version.versionNumber,
                toVersion: document.currentVersion,
                driftScore: drift,
                severity: drift >= SIGNIFICANT_DRIFT_THRESHOLD ? 'significant' : 'moderate',
                summary: version.summary || `Version ${version.versionNumber}`,
            });
        }
    }

    // Only report the most recent significant drift
    const significantChanges = changes.filter(c => c.severity === 'significant');
    const hasSignificantDrift = significantChanges.length > 0;

    // Calculate penalty
    let penalty = 0;
    if (maxDrift >= SIGNIFICANT_DRIFT_THRESHOLD) {
        penalty = 0.2;
    } else if (maxDrift >= MODERATE_DRIFT_THRESHOLD) {
        penalty = 0.1;
    }

    // Build decay reason if drift detected
    let decayReason = null;
    if (hasSignificantDrift) {
        const mostRecent = significantChanges[0];
        decayReason = {
            type: 'version_drift',
            description: `Significant semantic change detected from version ${mostRecent.fromVersion} to ${mostRecent.toVersion} (drift score: ${mostRecent.driftScore})`,
            sources: [],
        };
    }

    return {
        hasDrift: maxDrift >= MODERATE_DRIFT_THRESHOLD,
        hasSignificantDrift,
        driftScore: Math.round(maxDrift * 1000) / 1000,
        penalty: Math.round(penalty * 1000) / 1000,
        changes,
        decayReason,
    };
}

/**
 * Identify what specifically changed between versions
 * @param {string} oldContent - Previous content
 * @param {string} newContent - Current content
 * @returns {Object} Change summary
 */
function identifyChanges(oldContent, newContent) {
    const oldLines = oldContent.split('\n').filter(l => l.trim());
    const newLines = newContent.split('\n').filter(l => l.trim());

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    const added = newLines.filter(l => !oldSet.has(l));
    const removed = oldLines.filter(l => !newSet.has(l));

    return {
        linesAdded: added.length,
        linesRemoved: removed.length,
        netChange: added.length - removed.length,
        sampleAdditions: added.slice(0, 3),
        sampleRemovals: removed.slice(0, 3),
    };
}

/**
 * Check if a version should be marked as historical
 * @param {Object} currentDoc - Current document
 * @param {Object} version - Version to check
 * @returns {boolean}
 */
function shouldMarkAsHistorical(currentDoc, version) {
    const drift = calculateSemanticDifference(currentDoc.content, version.content);
    return drift >= SIGNIFICANT_DRIFT_THRESHOLD;
}

module.exports = {
    analyzeVersionDrift,
    identifyChanges,
    shouldMarkAsHistorical,
    SIGNIFICANT_DRIFT_THRESHOLD,
    MODERATE_DRIFT_THRESHOLD,
};
