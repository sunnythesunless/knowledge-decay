/**
 * DocumentVersion Model
 * 
 * Tracks version history for documents.
 * Each version stores content snapshot and embedding for drift analysis.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentVersion = sequelize.define('DocumentVersion', {
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
    versionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'version_number',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // Embedding for semantic drift comparison
    embedding: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    // Who made this version
    author: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    // Change reason/notes
    changeNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'change_notes',
    },
}, {
    tableName: 'document_versions',
    indexes: [
        { fields: ['document_id'] },
        { fields: ['version_number'] },
        { fields: ['document_id', 'version_number'], unique: true },
    ],
});

module.exports = DocumentVersion;
