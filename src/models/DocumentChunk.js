/**
 * DocumentChunk Model
 * 
 * Stores document chunks with embeddings for RAG retrieval.
 * Documents are split into smaller chunks (~500 tokens) for
 * more precise semantic search.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentChunk = sequelize.define('DocumentChunk', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    documentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'document_id',
        references: {
            model: 'documents',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    chunkIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'chunk_index',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    // Embedding vector stored as JSON
    embedding: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    // Position in original document
    startPosition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'start_position',
    },
    endPosition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'end_position',
    },
    // Token count for this chunk
    tokenCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'token_count',
    },
}, {
    tableName: 'document_chunks',
    indexes: [
        { fields: ['document_id'] },
        { fields: ['chunk_index'] },
    ],
});

module.exports = DocumentChunk;
