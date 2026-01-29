/**
 * Vector Utilities
 * 
 * Abstraction layer for embedding generation.
 * Supports: TF-IDF (local), Gemini (production)
 */

const { generateTfIdfEmbedding, cosineSimilarity } = require('./textAnalysis');

// Lazy load Gemini to avoid import errors when not configured
let GoogleGenerativeAI = null;
let geminiModel = null;

/**
 * Initialize Gemini client
 */
function getGeminiClient() {
    if (!geminiModel) {
        if (!GoogleGenerativeAI) {
            GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        geminiModel = genAI.getGenerativeModel({
            model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
        });
    }
    return geminiModel;
}

/**
 * Get embedding for text based on configured provider
 * @param {string} text - Text to embed
 * @returns {Promise<Object|Array>} Embedding vector
 */
async function getEmbedding(text) {
    const provider = process.env.EMBEDDING_PROVIDER || 'tfidf';

    if (provider === 'tfidf') {
        return generateTfIdfEmbedding(text);
    }

    // Gemini embedding support
    if (provider === 'gemini') {
        try {
            const model = getGeminiClient();
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error('Gemini embedding error:', error.message);
            // Fallback to TF-IDF if Gemini fails
            console.log('Falling back to TF-IDF embeddings');
            return generateTfIdfEmbedding(text);
        }
    }

    // OpenAI embedding support (legacy placeholder)
    if (provider === 'openai') {
        throw new Error('OpenAI embeddings deprecated. Use EMBEDDING_PROVIDER=gemini');
    }

    throw new Error(`Unknown embedding provider: ${provider}`);
}

/**
 * Calculate similarity between two embeddings
 * @param {Object|Array} emb1 - First embedding
 * @param {Object|Array} emb2 - Second embedding
 * @returns {number} Similarity score 0.0 to 1.0
 */
function calculateSimilarity(emb1, emb2) {
    // Handle TF-IDF object format
    if (typeof emb1 === 'object' && !Array.isArray(emb1)) {
        return cosineSimilarity(emb1, emb2);
    }

    // Handle dense vector format (Gemini embeddings)
    if (Array.isArray(emb1)) {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < emb1.length; i++) {
            dotProduct += emb1[i] * emb2[i];
            norm1 += emb1[i] * emb1[i];
            norm2 += emb2[i] * emb2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    return 0;
}

/**
 * Check if embedding provider is configured and working
 */
async function checkEmbeddingHealth() {
    const provider = process.env.EMBEDDING_PROVIDER || 'tfidf';
    try {
        const testEmbed = await getEmbedding('health check test');
        return {
            provider,
            status: 'healthy',
            embeddingType: Array.isArray(testEmbed) ? 'dense' : 'sparse',
        };
    } catch (error) {
        return {
            provider,
            status: 'error',
            error: error.message,
        };
    }
}

module.exports = {
    getEmbedding,
    calculateSimilarity,
    checkEmbeddingHealth,
};
