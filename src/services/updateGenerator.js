/**
 * Update Generator Service
 * 
 * Generates AI-assisted update recommendations for decayed documents.
 * All suggestions are marked as review-ready for human approval.
 * 
 * NOTE: This is NOT auto-approval. Human admin reviews and edits.
 */

const { extractKeyStatements } = require('../utils/textAnalysis');

/**
 * Generate update recommendations based on decay analysis
 * @param {Object} document - Document under review
 * @param {Object} decayAnalysis - Results from decay analysis
 * @param {Array<Object>} newerDocs - Newer related documents
 * @returns {Object} Update recommendations
 */
function generateUpdateRecommendations(document, decayAnalysis, newerDocs = []) {
    const recommendations = [];
    const { decayReasons } = decayAnalysis;

    // Process each decay reason
    for (const reason of decayReasons) {
        switch (reason.type) {
            case 'time':
                recommendations.push(generateTimeBasedUpdate(document, reason));
                break;
            case 'contradiction':
                recommendations.push(generateContradictionUpdate(document, reason, newerDocs));
                break;
            case 'version_drift':
                recommendations.push(generateDriftUpdate(document, reason));
                break;
            case 'low_support':
                recommendations.push(generateSupportUpdate(document, reason));
                break;
        }
    }

    // Filter out null recommendations
    const validRecommendations = recommendations.filter(r => r !== null);

    // Generate summary of what changed
    const whatChangedSummary = generateWhatChangedSummary(decayReasons, newerDocs);

    return {
        recommendations: validRecommendations,
        whatChangedSummary,
        requiresHumanReview: true,
        reviewInstructions: 'Please review each suggested update carefully. AI suggestions may need adjustment based on current organizational context.',
    };
}

/**
 * Generate update for time-based decay
 */
function generateTimeBasedUpdate(document, reason) {
    return {
        section: 'Document Review Required',
        suggested_text: `[REVIEW NEEDED] This ${document.type} was last updated ${extractDays(reason.description)} days ago. Please verify that all information is still current and accurate. Key areas to check:\n- Process steps and procedures\n- Referenced tools and versions\n- Contact information and responsible parties\n- Compliance requirements`,
        reason: reason.description,
        priority: 'medium',
    };
}

/**
 * Generate update for contradiction
 */
function generateContradictionUpdate(document, reason, newerDocs) {
    const conflictingDoc = newerDocs.find(d =>
        reason.sources.includes(d.id)
    );

    let suggestedText = '[CONFLICT DETECTED] ';

    if (conflictingDoc) {
        suggestedText += `This section may conflict with "${conflictingDoc.title}" (updated ${formatDate(conflictingDoc.updatedAt)}). `;
        suggestedText += `Please reconcile the following difference:\n\n`;
        suggestedText += `Current document states different information than the newer source. `;
        suggestedText += `Consider updating to align with the latest guidance.`;
    } else {
        suggestedText += `A conflicting statement was detected. Please review and update as needed.`;
    }

    return {
        section: extractSection(reason.description),
        suggested_text: suggestedText,
        reason: reason.description,
        priority: 'high',
    };
}

/**
 * Generate update for version drift
 */
function generateDriftUpdate(document, reason) {
    return {
        section: 'Version History Note',
        suggested_text: `[SIGNIFICANT CHANGES] This document has undergone substantial revisions. Previous versions may contain outdated information and should be considered historical reference only. Current version (v${document.currentVersion}) is the authoritative source.`,
        reason: reason.description,
        priority: 'low',
    };
}

/**
 * Generate update for low support
 */
function generateSupportUpdate(document, reason) {
    return {
        section: 'Verification Needed',
        suggested_text: `[LOW SUPPORTING EVIDENCE] This document has limited supporting documentation. Consider:\n- Adding references to related documents\n- Cross-referencing with team leads\n- Documenting sources for key claims`,
        reason: reason.description,
        priority: 'medium',
    };
}

/**
 * Generate summary of what changed
 */
function generateWhatChangedSummary(decayReasons, newerDocs) {
    if (decayReasons.length === 0) {
        return 'No significant changes detected.';
    }

    const parts = [];

    const hasTime = decayReasons.some(r => r.type === 'time');
    const hasContradiction = decayReasons.some(r => r.type === 'contradiction');
    const hasDrift = decayReasons.some(r => r.type === 'version_drift');

    if (hasTime) {
        parts.push('The document has not been reviewed recently and may contain outdated information.');
    }

    if (hasContradiction) {
        const contradictions = decayReasons.filter(r => r.type === 'contradiction');
        const docTitles = newerDocs
            .filter(d => contradictions.some(c => c.sources.includes(d.id)))
            .map(d => d.title);

        if (docTitles.length > 0) {
            parts.push(`Conflicting information was found in: ${docTitles.join(', ')}.`);
        } else {
            parts.push('Conflicting information was detected in related documents.');
        }
    }

    if (hasDrift) {
        parts.push('Significant semantic changes were made in recent versions.');
    }

    return parts.join(' ') || 'Decay signals detected. Review recommended.';
}

/**
 * Extract days from description
 */
function extractDays(description) {
    const match = description.match(/(\d+)\s*days?\s*ago/i);
    return match ? match[1] : 'N';
}

/**
 * Extract section name from description
 */
function extractSection(description) {
    // Try to find quoted sections
    const match = description.match(/"([^"]+)"/);
    if (match) {
        return match[1].substring(0, 50);
    }
    return 'Conflicting Section';
}

/**
 * Format date for display
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

module.exports = {
    generateUpdateRecommendations,
};
