/**
 * ChatHistory Model
 * 
 * Stores Q&A conversation history for workspaces.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatHistory = sequelize.define('ChatHistory', {
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
    sessionId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'session_id',
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    answer: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    // Source documents used for the answer
    sources: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    // Any warnings (stale sources, etc.)
    warnings: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    // User feedback
    feedback: {
        type: DataTypes.ENUM('helpful', 'not_helpful', 'none'),
        defaultValue: 'none',
    },
    // Response time in milliseconds
    responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'response_time_ms',
    },
}, {
    tableName: 'chat_history',
    indexes: [
        { fields: ['workspace_id'] },
        { fields: ['session_id'] },
        { fields: ['created_at'] },
    ],
});

module.exports = ChatHistory;
