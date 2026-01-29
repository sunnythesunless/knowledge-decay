/**
 * Model Index
 * 
 * Centralizes model imports and defines associations.
 */

const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const DecayAnalysis = require('./DecayAnalysis');
const DocumentChunk = require('./DocumentChunk');
const ChatHistory = require('./ChatHistory');

// Define associations
Document.hasMany(DocumentVersion, {
    foreignKey: 'documentId',
    as: 'versions',
});

DocumentVersion.belongsTo(Document, {
    foreignKey: 'documentId',
    as: 'document',
});

Document.hasMany(DecayAnalysis, {
    foreignKey: 'documentId',
    as: 'analyses',
});

DecayAnalysis.belongsTo(Document, {
    foreignKey: 'documentId',
    as: 'document',
});

Document.hasMany(DocumentChunk, {
    foreignKey: 'documentId',
    as: 'chunks',
});

DocumentChunk.belongsTo(Document, {
    foreignKey: 'documentId',
    as: 'document',
});

module.exports = {
    Document,
    DocumentVersion,
    DecayAnalysis,
    DocumentChunk,
    ChatHistory,
};
