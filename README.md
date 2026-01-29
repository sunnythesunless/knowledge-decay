# InsightOps — Knowledge Decay Detection Engine

A production-ready knowledge governance backend that detects outdated or conflicting internal documents, assigns confidence scores, and routes AI-suggested updates through human review.

## 🎯 Features

- **Time-based freshness evaluation** - Different decay thresholds per document type
- **Contradiction detection** - Identifies conflicts between documents
- **Version drift analysis** - Tracks semantic changes across versions
- **Confidence scoring** - Penalty-based model with full audit breakdown
- **Human-in-the-loop updates** - AI-generated suggestions for human review

## 🚀 Quick Start

### Development (SQLite + TF-IDF)
```bash
npm install
npm run dev
```

### Production (PostgreSQL + Gemini)
```bash
# 1. Copy production environment
copy .env.production .env

# 2. Edit .env with your credentials:
#    - GEMINI_API_KEY=your_key_here
#    - DB_PASSWORD=your_postgres_password

# 3. Create PostgreSQL database
createdb insightops

# 4. Start server
npm start
```

## ⚙️ Production Setup

### 1. Database: PostgreSQL
```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insightops
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

### 2. Embeddings: Gemini API
Get your API key from: https://aistudio.google.com/apikey
```env
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

## 📡 API Endpoints

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |

### Decay Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/decay/analyze` | Analyze single document |
| POST | `/api/decay/batch` | Batch analyze documents |
| GET | `/api/decay/reports` | Get decay reports |
| GET | `/api/decay/summary` | Get workspace summary |

## 📋 Output Format

```json
{
  "decay_detected": true,
  "confidence_score": 0.65,
  "risk_level": "medium",
  "decay_reasons": [
    {
      "type": "time",
      "description": "Document last updated 95 days ago"
    }
  ],
  "what_changed_summary": "The document has not been reviewed recently...",
  "update_recommendations": [
    {
      "section": "Document Review Required",
      "suggested_text": "[REVIEW NEEDED] This SOP was last updated..."
    }
  ],
  "citations": ["doc-uuid-123"]
}
```

## 🏗️ Architecture

```
src/
├── config/database.js       # SQLite/PostgreSQL abstraction
├── models/                  # Sequelize models
├── services/                # Core decay detection logic
│   ├── decayEngine.js       # Main orchestrator
│   ├── freshnessEvaluator.js
│   ├── contradictionDetector.js
│   ├── versionDriftAnalyzer.js
│   ├── confidenceScorer.js
│   └── updateGenerator.js
├── routes/                  # API endpoints
├── utils/vectorUtils.js     # TF-IDF / Gemini embeddings
└── middleware/              # Error handling
```

## 📊 Decay Thresholds

| Document Type | Warning (days) | Critical (days) |
|--------------|----------------|-----------------|
| SOP          | 30             | 90              |
| Policy       | 60             | 180             |
| Guide        | 90             | 365             |
| Spec         | 45             | 120             |
| Notes        | 180            | 365             |

## 🧪 Testing

```bash
npm test                 # Unit tests (46 tests)
```

## 📝 License

MIT
