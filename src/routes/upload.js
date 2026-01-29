/**
 * Upload Routes
 * 
 * Handles file uploads for documents (PDF, DOCX, TXT).
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { Document } = require('../models');
const { parseDocument, isSupported, getMaxFileSize } = require('../services/documentParser');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getEmbedding } = require('../utils/vectorUtils');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    if (isSupported(file.originalname)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, `Unsupported file type. Allowed: PDF, DOCX, TXT, MD`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: getMaxFileSize(),
    },
});

/**
 * POST /api/upload
 * Upload a document file (PDF, DOCX, TXT)
 */
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded');
    }

    const { workspaceId, type = 'Notes', author = 'system' } = req.body;

    if (!workspaceId) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => { });
        throw new ApiError(400, 'workspaceId is required');
    }

    try {
        // Parse the document
        const parsed = await parseDocument(req.file.path, req.file.mimetype);

        if (!parsed.content || parsed.content.length === 0) {
            throw new ApiError(400, 'Could not extract text from file. File may be empty or image-based.');
        }

        // Generate title from filename if not provided
        const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));

        // Generate embedding for the content
        let embedding = null;
        try {
            embedding = await getEmbedding(parsed.content.substring(0, 5000)); // Limit for embedding
        } catch (embError) {
            console.warn('Embedding generation failed, continuing without:', embError.message);
        }

        // Create document in database
        const document = await Document.create({
            id: uuidv4(),
            workspaceId,
            title,
            type,
            author,
            content: parsed.content,
            currentVersion: 1,
            embedding,
            originalFilename: req.file.originalname,
            fileSize: req.file.size,
        });

        // Generate AI summary (async, non-blocking)
        let aiData = { summary: '', keyPoints: [], topics: [], aiGenerated: false };
        try {
            const { summarizeDocument } = require('../services/aiSummarizer');
            aiData = await summarizeDocument(parsed.content, title);

            // Update document with AI data
            await document.update({
                aiSummary: aiData.summary,
                keyPoints: aiData.keyPoints,
                detectedTopics: aiData.topics,
            });
        } catch (aiError) {
            console.warn('AI summarization skipped:', aiError.message);
        }

        // Clean up uploaded file after processing
        await fs.unlink(req.file.path).catch(() => { });

        res.status(201).json({
            id: document.id,
            title: document.title,
            type: document.type,
            author: document.author,
            workspaceId: document.workspaceId,
            contentLength: parsed.content.length,
            ai: {
                summary: aiData.summary,
                keyPoints: aiData.keyPoints,
                topics: aiData.topics,
                aiGenerated: aiData.aiGenerated,
            },
            metadata: {
                originalFilename: req.file.originalname,
                fileSize: req.file.size,
                ...parsed.metadata,
            },
            createdAt: document.createdAt,
        });

    } catch (error) {
        // Clean up file on error
        await fs.unlink(req.file.path).catch(() => { });
        throw error;
    }
}));

/**
 * GET /api/upload/supported
 * Get list of supported file types
 */
router.get('/supported', (req, res) => {
    res.json({
        supportedFormats: [
            { extension: '.pdf', mimeType: 'application/pdf', maxSize: '10MB' },
            { extension: '.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', maxSize: '10MB' },
            { extension: '.txt', mimeType: 'text/plain', maxSize: '5MB' },
            { extension: '.md', mimeType: 'text/markdown', maxSize: '5MB' },
        ],
        maxFileSize: getMaxFileSize(),
    });
});

module.exports = router;
