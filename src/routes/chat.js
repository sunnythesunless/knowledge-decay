/**
 * Chat Routes
 * 
 * Q&A interface for documents using RAG.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { askQuestion, isRAGAvailable } = require('../services/ragEngine');
const { searchDocuments } = require('../services/vectorSearch');
const { ChatHistory } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/chat
 * Ask a question about documents
 */
router.post('/', asyncHandler(async (req, res) => {
    const { workspaceId, question, sessionId } = req.body;
    const startTime = Date.now();

    if (!workspaceId) {
        throw new ApiError(400, 'workspaceId is required');
    }

    if (!question || question.trim().length === 0) {
        throw new ApiError(400, 'question is required');
    }

    if (question.length > 1000) {
        throw new ApiError(400, 'Question too long. Maximum 1000 characters.');
    }

    const result = await askQuestion(question.trim(), workspaceId);
    const responseTimeMs = Date.now() - startTime;

    // Store chat history
    const historyEntry = await ChatHistory.create({
        id: uuidv4(),
        workspaceId,
        sessionId: sessionId || null,
        question: question.trim(),
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources || [],
        warnings: result.warnings || [],
        responseTimeMs,
    });

    res.json({
        id: historyEntry.id,
        question,
        ...result,
        aiEnabled: isRAGAvailable(),
        responseTimeMs,
    });
}));

/**
 * POST /api/chat/search
 * Search for relevant documents
 */
router.post('/search', asyncHandler(async (req, res) => {
    const { workspaceId, query, limit = 5 } = req.body;

    if (!workspaceId) {
        throw new ApiError(400, 'workspaceId is required');
    }

    if (!query || query.trim().length === 0) {
        throw new ApiError(400, 'query is required');
    }

    const results = await searchDocuments(query.trim(), workspaceId, Math.min(limit, 10));

    res.json({
        query,
        results,
        count: results.length,
    });
}));

/**
 * GET /api/chat/history
 * Get conversation history for a workspace
 */
router.get('/history', asyncHandler(async (req, res) => {
    const { workspaceId, sessionId, limit = 50 } = req.query;

    if (!workspaceId) {
        throw new ApiError(400, 'workspaceId is required');
    }

    const where = { workspaceId };
    if (sessionId) {
        where.sessionId = sessionId;
    }

    const history = await ChatHistory.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: Math.min(parseInt(limit) || 50, 100),
    });

    res.json({
        history: history.map(h => ({
            id: h.id,
            question: h.question,
            answer: h.answer,
            confidence: h.confidence,
            sources: h.sources,
            warnings: h.warnings,
            feedback: h.feedback,
            responseTimeMs: h.responseTimeMs,
            createdAt: h.createdAt,
        })),
        count: history.length,
    });
}));

/**
 * PUT /api/chat/:id/feedback
 * Provide feedback on a chat response
 */
router.put('/:id/feedback', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { feedback } = req.body;

    if (!['helpful', 'not_helpful'].includes(feedback)) {
        throw new ApiError(400, 'feedback must be "helpful" or "not_helpful"');
    }

    const entry = await ChatHistory.findByPk(id);
    if (!entry) {
        throw new ApiError(404, 'Chat history entry not found');
    }

    entry.feedback = feedback;
    await entry.save();

    res.json({
        id: entry.id,
        feedback: entry.feedback,
        message: 'Feedback recorded',
    });
}));

/**
 * GET /api/chat/status
 * Check if AI chat is available
 */
router.get('/status', (req, res) => {
    res.json({
        aiEnabled: isRAGAvailable(),
        provider: isRAGAvailable() ? 'gemini' : 'basic',
        capabilities: isRAGAvailable()
            ? ['question_answering', 'document_search', 'source_citations']
            : ['document_search'],
    });
});

module.exports = router;

