/**
 * Model Index
 * 
 * Centralizes model imports and defines associations.
 */

const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const DecayAnalysis = require('./DecayAnalysis');

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

module.exports = {
    Document,
    DocumentVersion,
    DecayAnalysis,
};
