/**
 * DecayAnalysis Model
 * 
 * Stores decay analysis results for auditing and tracking.
 * Each analysis is a point-in-time snapshot of document health.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DecayAnalysis = sequelize.define('DecayAnalysis', {
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
    // Core decay results
    decayDetected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'decay_detected',
    },
    confidenceScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'confidence_score',
        validate: {
            min: 0.0,
            max: 1.0,
        },
    },
    riskLevel: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        field: 'risk_level',
    },
    // Detailed breakdown for auditing
    decayReasons: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        field: 'decay_reasons',
    },
    whatChangedSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'what_changed_summary',
    },
    updateRecommendations: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'update_recommendations',
    },
    citations: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    // Internal confidence breakdown for auditing
    // (As recommended: log the breakdown, not just final score)
    confidenceBreakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'confidence_breakdown',
        // Stores: { age_penalty, contradiction_penalty, drift_penalty, support_penalty }
    },
    // Analysis metadata
    analyzedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'analyzed_at',
    },
    analyzedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'analyzed_by',
        defaultValue: 'system',
    },
    // Human review tracking
    reviewStatus: {
        type: DataTypes.ENUM('pending', 'reviewed', 'dismissed', 'actioned'),
        defaultValue: 'pending',
        field: 'review_status',
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'reviewed_at',
    },
    reviewedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'reviewed_by',
    },
    reviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'review_notes',
    },
}, {
    tableName: 'decay_analyses',
    indexes: [
        { fields: ['document_id'] },
        { fields: ['decay_detected'] },
        { fields: ['risk_level'] },
        { fields: ['review_status'] },
        { fields: ['analyzed_at'] },
    ],
});

module.exports = DecayAnalysis;
