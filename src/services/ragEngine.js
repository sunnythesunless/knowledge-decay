/**
 * RAG Engine Service
 * 
 * Retrieval Augmented Generation for document Q&A.
 */

const { findRelevantContext } = require('./vectorSearch');

/**
 * Get Gemini client for chat
 */
function getGeminiClient() {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    });
}

/**
 * Answer a question based on workspace documents
 * @param {string} question - User question
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Object>} Answer with sources
 */
async function askQuestion(question, workspaceId) {
    // Find relevant context
    const { context, sources } = await findRelevantContext(question, workspaceId);

    if (!context || sources.length === 0) {
        return {
            answer: "I couldn't find any relevant documents in your workspace to answer this question. Please upload some documents first.",
            confidence: 0,
            sources: [],
            warnings: [],
        };
    }

    const model = getGeminiClient();

    // Fallback to simple response if Gemini not available
    if (!model) {
        return generateBasicAnswer(question, sources);
    }

    try {
        const prompt = `You are a helpful assistant that answers questions based on the provided document context.

CONTEXT FROM DOCUMENTS:
${context}

USER QUESTION: ${question}

Instructions:
1. Answer based ONLY on the provided context
2. If the context doesn't contain enough information, say so
3. Reference which source(s) you used
4. Be concise and direct

Provide your response in JSON format:
{
  "answer": "Your answer here",
  "confidence": 0.0-1.0,
  "sourcesUsed": [1, 2, etc]
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON response
        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);

        // Check for stale sources
        const warnings = [];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        for (const source of sources) {
            if (new Date(source.updatedAt) < thirtyDaysAgo) {
                const daysOld = Math.floor((Date.now() - new Date(source.updatedAt)) / (24 * 60 * 60 * 1000));
                warnings.push({
                    type: 'stale_source',
                    message: `"${source.title}" was last updated ${daysOld} days ago`,
                    documentId: source.documentId,
                });
            }
        }

        return {
            answer: parsed.answer || "I couldn't generate an answer.",
            confidence: parsed.confidence || 0.5,
            sources: sources.slice(0, 3), // Top 3 sources
            warnings,
        };
    } catch (error) {
        console.error('RAG engine error:', error.message);
        return generateBasicAnswer(question, sources);
    }
}

/**
 * Generate basic answer without AI
 */
function generateBasicAnswer(question, sources) {
    if (sources.length === 0) {
        return {
            answer: "No relevant documents found.",
            confidence: 0,
            sources: [],
            warnings: [],
        };
    }

    const topSource = sources[0];
    return {
        answer: `Based on "${topSource.title}", here's relevant information: ${topSource.excerpt || 'See the document for details.'}`,
        confidence: topSource.similarity,
        sources: sources.slice(0, 3),
        warnings: [{
            type: 'basic_mode',
            message: 'AI features not configured. Showing document excerpts only.',
        }],
    };
}

/**
 * Check if RAG is available
 */
function isRAGAvailable() {
    return !!process.env.GEMINI_API_KEY;
}

module.exports = {
    askQuestion,
    generateBasicAnswer,
    isRAGAvailable,
};
