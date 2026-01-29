/**
 * Documents API Routes
 * 
 * CRUD operations for documents and version management.
 */

const express = require('express');
const router = express.Router();
const { Document, DocumentVersion } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getEmbedding } = require('../utils/vectorUtils');

/**
 * GET /api/documents
 * List all documents with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { workspaceId, type, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (type) where.type = type;

    const documents = await Document.findAndCountAll({
        where,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [['updatedAt', 'DESC']],
        attributes: { exclude: ['embedding'] }, // Don't send embedding in list
    });

    res.json({
        documents: documents.rows,
        total: documents.count,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
    });
}));

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id, {
        include: [{
            model: DocumentVersion,
            as: 'versions',
            attributes: ['id', 'versionNumber', 'summary', 'createdAt', 'author'],
            order: [['versionNumber', 'DESC']],
            limit: 10,
        }],
    });

    if (!document) {
        throw new ApiError(404, 'Document not found');
    }

    res.json(document);
}));

/**
 * POST /api/documents
 * Create a new document
 */
router.post('/', asyncHandler(async (req, res) => {
    const { workspaceId, title, type, author, content } = req.body;

    // Validate required fields
    if (!workspaceId || !title || !author || !content) {
        throw new ApiError(400, 'Missing required fields: workspaceId, title, author, content');
    }

    // Generate embedding
    const embedding = await getEmbedding(content);

    const document = await Document.create({
        workspaceId,
        title,
        type: type || 'Notes',
        author,
        content,
        embedding,
        currentVersion: 1,
    });

    // Create initial version
    await DocumentVersion.create({
        documentId: document.id,
        versionNumber: 1,
        content,
        summary: 'Initial version',
        embedding,
        author,
    });

    res.status(201).json(document);
}));

/**
 * PUT /api/documents/:id
 * Update an existing document (creates new version)
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
        throw new ApiError(404, 'Document not found');
    }

    const { title, type, content, author, changeNotes } = req.body;

    // If content changed, create new version
    if (content && content !== document.content) {
        const newVersion = document.currentVersion + 1;
        const newEmbedding = await getEmbedding(content);

        // Create version record
        await DocumentVersion.create({
            documentId: document.id,
            versionNumber: newVersion,
            content,
            summary: changeNotes || `Version ${newVersion}`,
            embedding: newEmbedding,
            author: author || document.author,
            changeNotes,
        });

        // Update document
        await document.update({
            title: title || document.title,
            type: type || document.type,
            content,
            embedding: newEmbedding,
            currentVersion: newVersion,
        });
    } else {
        // Just update metadata
        await document.update({
            title: title || document.title,
            type: type || document.type,
        });
    }

    res.json(await Document.findByPk(req.params.id));
}));

/**
 * DELETE /api/documents/:id
 * Delete a document and all versions
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
        throw new ApiError(404, 'Document not found');
    }

    await document.destroy(); // Cascades to versions due to onDelete: CASCADE

    res.status(204).send();
}));

/**
 * GET /api/documents/:id/versions
 * Get version history for a document
 */
router.get('/:id/versions', asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
        throw new ApiError(404, 'Document not found');
    }

    const versions = await DocumentVersion.findAll({
        where: { documentId: req.params.id },
        order: [['versionNumber', 'DESC']],
        attributes: { exclude: ['embedding', 'content'] }, // Exclude large fields
    });

    res.json({
        documentId: req.params.id,
        currentVersion: document.currentVersion,
        versions,
    });
}));

/**
 * GET /api/documents/:id/versions/:version
 * Get specific version content
 */
router.get('/:id/versions/:version', asyncHandler(async (req, res) => {
    const version = await DocumentVersion.findOne({
        where: {
            documentId: req.params.id,
            versionNumber: parseInt(req.params.version, 10),
        },
    });

    if (!version) {
        throw new ApiError(404, 'Version not found');
    }

    res.json(version);
}));

/**
 * POST /api/documents/:id/verify
 * Mark document as verified (human review)
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
        throw new ApiError(404, 'Document not found');
    }

    const { verifiedBy } = req.body;

    if (!verifiedBy) {
        throw new ApiError(400, 'verifiedBy is required');
    }

    await document.update({
        lastVerifiedAt: new Date(),
        verifiedBy,
    });

    res.json({
        message: 'Document verified successfully',
        document: await Document.findByPk(req.params.id),
    });
}));

module.exports = router;
