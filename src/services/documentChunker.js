/**
 * Document Chunker Service
 * 
 * Splits documents into smaller chunks for RAG retrieval.
 */

const { getEmbedding } = require('../utils/vectorUtils');

/**
 * Split document content into chunks
 * @param {string} content - Document content
 * @param {Object} options - Chunking options
 * @returns {Array} Array of chunks with metadata
 */
function chunkDocument(content, options = {}) {
    const {
        chunkSize = 500,      // Target characters per chunk
        overlap = 50,         // Overlap between chunks
        minChunkSize = 100,   // Minimum chunk size
    } = options;

    if (!content || content.length === 0) {
        return [];
    }

    const chunks = [];
    const sentences = content.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let chunkIndex = 0;
    let startPosition = 0;

    for (const sentence of sentences) {
        // If adding this sentence would exceed chunk size
        if (currentChunk.length + sentence.length > chunkSize && currentChunk.length >= minChunkSize) {
            chunks.push({
                chunkIndex,
                content: currentChunk.trim(),
                startPosition,
                endPosition: startPosition + currentChunk.length,
            });

            // Start new chunk with overlap
            const overlapText = currentChunk.slice(-overlap);
            startPosition = startPosition + currentChunk.length - overlap;
            currentChunk = overlapText + ' ';
            chunkIndex++;
        }

        currentChunk += sentence + ' ';
    }

    // Add final chunk
    if (currentChunk.trim().length >= minChunkSize) {
        chunks.push({
            chunkIndex,
            content: currentChunk.trim(),
            startPosition,
            endPosition: startPosition + currentChunk.length,
        });
    }

    return chunks;
}

/**
 * Chunk document and generate embeddings
 * @param {string} documentId - Document ID
 * @param {string} content - Document content
 * @returns {Promise<Array>} Chunks with embeddings
 */
async function chunkWithEmbeddings(documentId, content) {
    const chunks = chunkDocument(content);

    const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => {
            try {
                const embedding = await getEmbedding(chunk.content);
                return {
                    ...chunk,
                    documentId,
                    embedding,
                };
            } catch (error) {
                console.warn(`Embedding failed for chunk ${chunk.chunkIndex}:`, error.message);
                return {
                    ...chunk,
                    documentId,
                    embedding: null,
                };
            }
        })
    );

    return chunksWithEmbeddings;
}

module.exports = {
    chunkDocument,
    chunkWithEmbeddings,
};
