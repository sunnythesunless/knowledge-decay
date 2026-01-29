/**
 * InsightOps - Knowledge Decay Detection Engine
 * 
 * Main entry point for the Express server.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const { sequelize, testConnection } = require('./config/database');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
const documentsRouter = require('./routes/documents');
const decayRouter = require('./routes/decay');
const uploadRouter = require('./routes/upload');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'insightops-decay-engine',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/documents', documentsRouter);
app.use('/api/decay', decayRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);

// API info
app.get('/api', (req, res) => {
    res.json({
        name: 'InsightOps Decay Detection Engine',
        version: '1.0.0',
        description: 'Knowledge decay detection and governance system',
        endpoints: {
            documents: {
                list: 'GET /api/documents',
                get: 'GET /api/documents/:id',
                create: 'POST /api/documents',
                update: 'PUT /api/documents/:id',
                delete: 'DELETE /api/documents/:id',
                versions: 'GET /api/documents/:id/versions',
                verify: 'POST /api/documents/:id/verify',
            },
            decay: {
                analyze: 'POST /api/decay/analyze',
                batch: 'POST /api/decay/batch',
                reports: 'GET /api/decay/reports',
                report: 'GET /api/decay/reports/:docId',
                review: 'PUT /api/decay/reports/:id/review',
                summary: 'GET /api/decay/summary',
            },
            upload: {
                upload: 'POST /api/upload (multipart/form-data)',
                supported: 'GET /api/upload/supported',
            },
            chat: {
                ask: 'POST /api/chat',
                search: 'POST /api/chat/search',
                history: 'GET /api/chat/history',
                feedback: 'PUT /api/chat/:id/feedback',
                status: 'GET /api/chat/status',
            },
        },
    });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
    try {
        // Ensure data directory exists
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Sync database models
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✓ Database models synchronized');

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🧠 InsightOps - Knowledge Decay Detection Engine          ║
║                                                              ║
║   Server running on: http://localhost:${PORT}                ║
║   Environment: ${process.env.NODE_ENV || 'development'}      ║
║   Database: ${process.env.DB_DIALECT || 'sqlite'}            ║
║                                                              ║
║   API Docs: http://localhost:${PORT}/api                     ║
║   Health: http://localhost:${PORT}/health                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app; // For testing
