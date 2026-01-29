/**
 * Document Model
 * 
 * Represents a knowledge document in the system.
 * Embeddings are stored as JSON (TF-IDF vectors) - designed to be
 * migrated to a separate embeddings table for production scale.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    workspaceId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'workspace_id',
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('SOP', 'Policy', 'Guide', 'Spec', 'Notes'),
        allowNull: false,
        defaultValue: 'Notes',
    },
    author: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    currentVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'current_version',
    },
    // TF-IDF embedding stored as JSON
    // NOTE: For production, consider separate document_embeddings table
    embedding: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    // Metadata for decay analysis
    lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_verified_at',
    },
    verifiedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'verified_by',
    },
}, {
    tableName: 'documents',
    indexes: [
        { fields: ['workspace_id'] },
        { fields: ['type'] },
        { fields: ['updated_at'] },
    ],
});

module.exports = Document;
