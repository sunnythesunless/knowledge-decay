/**
 * AI Summarizer Service
 * 
 * Uses Gemini to generate document summaries and extract key points.
 */

/**
 * Get Gemini client
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
 * Generate document summary with key points
 * @param {string} content - Document content
 * @param {string} title - Document title
 * @returns {Promise<Object>} Summary and key points
 */
async function summarizeDocument(content, title = '') {
    const model = getGeminiClient();

    // Fallback if Gemini not configured
    if (!model) {
        return generateBasicSummary(content);
    }

    try {
        const prompt = `Analyze this document and provide a JSON response with:
1. "summary": A concise 2-3 sentence summary of the document
2. "keyPoints": An array of 3-5 key points (short bullet points)
3. "topics": An array of 2-4 topic/category tags

Document Title: ${title}

Document Content:
${content.substring(0, 8000)}

Respond ONLY with valid JSON, no markdown or explanation.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Clean and parse JSON response
        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);

        return {
            summary: parsed.summary || '',
            keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            aiGenerated: true,
        };
    } catch (error) {
        console.warn('AI summarization failed, using basic summary:', error.message);
        return generateBasicSummary(content);
    }
}

/**
 * Generate basic summary without AI (fallback)
 */
function generateBasicSummary(content) {
    const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    const summary = sentences.slice(0, 2).join('. ') + '.';

    // Extract potential key points (sentences with action words)
    const actionWords = ['must', 'should', 'require', 'ensure', 'need', 'important'];
    const keyPoints = sentences
        .filter(s => actionWords.some(w => s.toLowerCase().includes(w)))
        .slice(0, 5);

    return {
        summary: summary.substring(0, 500),
        keyPoints: keyPoints.length > 0 ? keyPoints : sentences.slice(0, 3),
        topics: [],
        aiGenerated: false,
    };
}

/**
 * Generate AI-powered update recommendation
 * @param {Object} document - Document data
 * @param {Array} decayReasons - Detected decay reasons
 * @returns {Promise<Array>} Update recommendations
 */
async function generateAIRecommendation(document, decayReasons) {
    const model = getGeminiClient();

    if (!model || !decayReasons || decayReasons.length === 0) {
        return [];
    }

    try {
        const reasonsText = decayReasons.map(r => `- ${r.type}: ${r.description}`).join('\n');

        const prompt = `This document has knowledge decay issues:

Document Title: ${document.title}
Document Type: ${document.type}
Issues Found:
${reasonsText}

Document Content (excerpt):
${document.content.substring(0, 3000)}

Generate 1-3 specific update recommendations. Respond with JSON array:
[
  {
    "section": "Section name to update",
    "issue": "What's wrong",
    "suggestedAction": "What to do",
    "priority": "high|medium|low"
  }
]

Respond ONLY with valid JSON array.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanedResponse);
    } catch (error) {
        console.warn('AI recommendation failed:', error.message);
        return [];
    }
}

/**
 * Check if AI features are available
 */
function isAIAvailable() {
    return !!process.env.GEMINI_API_KEY;
}

module.exports = {
    summarizeDocument,
    generateBasicSummary,
    generateAIRecommendation,
    isAIAvailable,
};
