/**
 * Text Analysis Utilities
 * 
 * Core NLP utilities for document comparison.
 * Uses TF-IDF vectors with cosine similarity.
 * 
 * DESIGN NOTE: This is designed to be swappable.
 * To use OpenAI embeddings:
 * 1. Set EMBEDDING_PROVIDER=openai in .env
 * 2. Implement OpenAI embedding in getEmbedding()
 * The rest of the system won't need to change.
 */

const natural = require('natural');

// TF-IDF for document vectorization
const TfIdf = natural.TfIdf;

// Tokenizer for text processing
const tokenizer = new natural.WordTokenizer();

// Stemmer for normalizing words
const stemmer = natural.PorterStemmer;

/**
 * Generate TF-IDF embedding for text
 * @param {string} text - Document text
 * @returns {Object} TF-IDF vector as object {term: weight}
 */
function generateTfIdfEmbedding(text) {
    if (!text || typeof text !== 'string') {
        return {};
    }

    const tfidf = new TfIdf();
    const normalizedText = text.toLowerCase();

    tfidf.addDocument(normalizedText);

    const terms = {};
    tfidf.listTerms(0).forEach((item) => {
        // Only include terms with meaningful weight
        if (item.tfidf > 0.1) {
            terms[item.term] = Math.round(item.tfidf * 1000) / 1000;
        }
    });

    return terms;
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 * @param {Object} vec1 - First TF-IDF vector
 * @param {Object} vec2 - Second TF-IDF vector
 * @returns {number} Similarity score 0.0 to 1.0
 */
function cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || Object.keys(vec1).length === 0 || Object.keys(vec2).length === 0) {
        return 0;
    }

    const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    allTerms.forEach((term) => {
        const v1 = vec1[term] || 0;
        const v2 = vec2[term] || 0;
        dotProduct += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
    });

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
        return 0;
    }

    return Math.round((dotProduct / magnitude) * 1000) / 1000;
}

/**
 * Extract key statements from text for contradiction detection
 * @param {string} text - Document text
 * @returns {Array<string>} Array of key statements
 */
function extractKeyStatements(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // Split into sentences
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Only meaningful sentences

    // Filter to statements that contain factual indicators
    const factualPatterns = [
        /\b(must|shall|should|will|always|never|required|mandatory)\b/i,
        /\b(step|process|procedure|method|approach)\b/i,
        /\b(version|release|update|deploy)\b/i,
        /\b(\d+\.?\d*)\b/, // Numbers
    ];

    return sentences.filter(sentence =>
        factualPatterns.some(pattern => pattern.test(sentence))
    );
}

/**
 * Compare two statements for potential contradiction
 * @param {string} stmt1 - First statement
 * @param {string} stmt2 - Second statement 
 * @returns {Object} { isContradiction: boolean, score: number, reason: string }
 */
function detectStatementContradiction(stmt1, stmt2) {
    const s1 = stmt1.toLowerCase();
    const s2 = stmt2.toLowerCase();

    // Check for explicit negation patterns
    const negationPatterns = [
        { pos: /\bmust\b/, neg: /\bmust not\b|\bshould not\b/ },
        { pos: /\balways\b/, neg: /\bnever\b/ },
        { pos: /\brequired\b/, neg: /\boptional\b|\bnot required\b/ },
        { pos: /\benable\b/, neg: /\bdisable\b/ },
    ];

    for (const pattern of negationPatterns) {
        if ((pattern.pos.test(s1) && pattern.neg.test(s2)) ||
            (pattern.neg.test(s1) && pattern.pos.test(s2))) {
            // Check if they're about the same topic (high similarity in other terms)
            const vec1 = generateTfIdfEmbedding(s1);
            const vec2 = generateTfIdfEmbedding(s2);
            const similarity = cosineSimilarity(vec1, vec2);

            if (similarity > 0.3) {
                return {
                    isContradiction: true,
                    score: similarity,
                    reason: 'Contradicting requirements detected',
                };
            }
        }
    }

    // Check for numerical contradictions
    const numPattern = /(\d+\.?\d*)\s*(days?|hours?|minutes?|weeks?|%|percent)/gi;
    const nums1 = [...s1.matchAll(numPattern)];
    const nums2 = [...s2.matchAll(numPattern)];

    if (nums1.length > 0 && nums2.length > 0) {
        for (const n1 of nums1) {
            for (const n2 of nums2) {
                // Same unit but different number
                if (n1[2].toLowerCase().replace(/s$/, '') === n2[2].toLowerCase().replace(/s$/, '') &&
                    n1[1] !== n2[1]) {
                    const vec1 = generateTfIdfEmbedding(s1.replace(numPattern, ''));
                    const vec2 = generateTfIdfEmbedding(s2.replace(numPattern, ''));
                    const similarity = cosineSimilarity(vec1, vec2);

                    if (similarity > 0.4) {
                        return {
                            isContradiction: true,
                            score: similarity,
                            reason: `Numerical conflict: ${n1[1]} ${n1[2]} vs ${n2[1]} ${n2[2]}`,
                        };
                    }
                }
            }
        }
    }

    return { isContradiction: false, score: 0, reason: null };
}

/**
 * Calculate semantic difference between two texts
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Difference score 0.0 to 1.0 (higher = more different)
 */
function calculateSemanticDifference(text1, text2) {
    const vec1 = generateTfIdfEmbedding(text1);
    const vec2 = generateTfIdfEmbedding(text2);
    const similarity = cosineSimilarity(vec1, vec2);

    return Math.round((1 - similarity) * 1000) / 1000;
}

module.exports = {
    generateTfIdfEmbedding,
    cosineSimilarity,
    extractKeyStatements,
    detectStatementContradiction,
    calculateSemanticDifference,
};
