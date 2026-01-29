/**
 * Contradiction Detector Service
 * 
 * Detects contradictions between documents.
 * Flags when factual statements conflict between documents.
 */

const {
    extractKeyStatements,
    detectStatementContradiction,
    cosineSimilarity,
    generateTfIdfEmbedding,
} = require('../utils/textAnalysis');

/**
 * Find contradictions between a document and related documents
 * @param {Object} document - Document under review
 * @param {Array<Object>} relatedDocs - Array of related documents
 * @returns {Object} Contradiction detection results
 */
function detectContradictions(document, relatedDocs) {
    if (!relatedDocs || relatedDocs.length === 0) {
        return {
            hasContradictions: false,
            contradictions: [],
            penalty: 0,
        };
    }

    const docStatements = extractKeyStatements(document.content);
    const contradictions = [];

    for (const relatedDoc of relatedDocs) {
        // Only check documents that are newer or recently updated
        const docDate = new Date(document.updatedAt);
        const relatedDate = new Date(relatedDoc.updatedAt);

        // Skip if related doc is older and not more authoritative
        if (relatedDate < docDate && !isMoreAuthoritative(relatedDoc, document)) {
            continue;
        }

        const relatedStatements = extractKeyStatements(relatedDoc.content);

        for (const stmt1 of docStatements) {
            for (const stmt2 of relatedStatements) {
                const result = detectStatementContradiction(stmt1, stmt2);

                if (result.isContradiction) {
                    contradictions.push({
                        thisDocument: {
                            statement: stmt1,
                            documentId: document.id,
                        },
                        conflictsWith: {
                            statement: stmt2,
                            documentId: relatedDoc.id,
                            documentTitle: relatedDoc.title,
                        },
                        severity: result.score > 0.6 ? 'high' : 'medium',
                        reason: result.reason,
                    });
                }
            }
        }
    }

    // Calculate penalty based on contradictions found
    const penalty = calculateContradictionPenalty(contradictions);

    // Build decay reasons
    const decayReasons = contradictions.map(c => ({
        type: 'contradiction',
        description: `"${truncate(c.thisDocument.statement, 60)}" conflicts with "${truncate(c.conflictsWith.statement, 60)}" in "${c.conflictsWith.documentTitle}"`,
        sources: [c.conflictsWith.documentId],
    }));

    return {
        hasContradictions: contradictions.length > 0,
        contradictions,
        penalty,
        decayReasons,
    };
}

/**
 * Check if doc2 is more authoritative than doc1
 * @param {Object} doc1 - First document
 * @param {Object} doc2 - Second document
 * @returns {boolean}
 */
function isMoreAuthoritative(doc1, doc2) {
    // SOPs and Policies are more authoritative than Notes
    const typeRank = {
        SOP: 5,
        Policy: 4,
        Spec: 3,
        Guide: 2,
        Notes: 1,
    };

    return (typeRank[doc1.type] || 1) > (typeRank[doc2.type] || 1);
}

/**
 * Calculate penalty from contradictions
 * @param {Array} contradictions - List of contradictions
 * @returns {number} Penalty 0.0 to 0.4
 */
function calculateContradictionPenalty(contradictions) {
    if (contradictions.length === 0) return 0;

    const highSeverity = contradictions.filter(c => c.severity === 'high').length;
    const mediumSeverity = contradictions.filter(c => c.severity === 'medium').length;

    // Max penalty is 0.4
    let penalty = (highSeverity * 0.15) + (mediumSeverity * 0.08);
    return Math.min(0.4, Math.round(penalty * 1000) / 1000);
}

/**
 * Truncate text for display
 * @param {string} text - Text to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string}
 */
function truncate(text, maxLen) {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
}

/**
 * Find related documents based on content similarity
 * @param {Object} document - Source document
 * @param {Array<Object>} allDocs - All documents to compare
 * @param {number} threshold - Similarity threshold (default 0.3)
 * @returns {Array<Object>} Related documents
 */
function findRelatedDocuments(document, allDocs, threshold = 0.3) {
    const docEmbedding = document.embedding || generateTfIdfEmbedding(document.content);

    return allDocs
        .filter(d => d.id !== document.id)
        .map(d => ({
            ...d,
            similarity: cosineSimilarity(
                docEmbedding,
                d.embedding || generateTfIdfEmbedding(d.content)
            ),
        }))
        .filter(d => d.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
}

module.exports = {
    detectContradictions,
    findRelatedDocuments,
    isMoreAuthoritative,
};
