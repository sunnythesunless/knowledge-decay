# InsightOps API Testing Guide

**Base URL:** `http://localhost:4000`

---

## 1. Health Check

### GET /health
```
GET http://localhost:4000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "insightops-decay-engine",
  "version": "1.0.0",
  "timestamp": "2026-01-29T14:00:00.000Z"
}
```

---

## 2. API Info

### GET /api
```
GET http://localhost:4000/api
```

**Expected Response:**
```json
{
  "name": "InsightOps Decay Detection Engine",
  "version": "1.0.0",
  "endpoints": {
    "documents": "/api/documents",
    "decay": "/api/decay"
  }
}
```

---

## 3. Documents API

### 3.1 Create Document
```
POST http://localhost:4000/api/documents
Content-Type: application/json

{
  "workspaceId": "ws-test-001",
  "title": "Deployment SOP v2.0",
  "type": "SOP",
  "author": "John Admin",
  "content": "Step 1: Run all unit tests. Step 2: Deploy to staging environment. Step 3: Run integration tests. Step 4: Deploy to production. Deployment must be completed within 5 business days."
}
```

**Expected Response (201 Created):**
```json
{
  "id": "uuid-here",
  "workspaceId": "ws-test-001",
  "title": "Deployment SOP v2.0",
  "type": "SOP",
  "author": "John Admin",
  "content": "Step 1: Run all unit tests...",
  "currentVersion": 1,
  "createdAt": "2026-01-29T14:00:00.000Z",
  "updatedAt": "2026-01-29T14:00:00.000Z"
}
```

### 3.2 List All Documents
```
GET http://localhost:4000/api/documents
```

**Query Parameters (optional):**
- `workspaceId` - Filter by workspace
- `type` - Filter by document type (SOP, Policy, Guide, Spec, Notes)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Example:**
```
GET http://localhost:4000/api/documents?workspaceId=ws-test-001&type=SOP
```

### 3.3 Get Single Document
```
GET http://localhost:4000/api/documents/:id
```

**Example:**
```
GET http://localhost:4000/api/documents/abc123-uuid-here
```

### 3.4 Update Document
```
PUT http://localhost:4000/api/documents/:id
Content-Type: application/json

{
  "title": "Deployment SOP v2.1 - Updated",
  "content": "Step 1: Run all unit tests. Step 2: Deploy to staging. Step 3: Run smoke tests. Step 4: Deploy to production within 3 days."
}
```

### 3.5 Delete Document
```
DELETE http://localhost:4000/api/documents/:id
```

### 3.6 Add Version to Document
```
POST http://localhost:4000/api/documents/:id/versions
Content-Type: application/json

{
  "content": "Updated content for version 2 of this document...",
  "summary": "Fixed deployment timeline from 5 days to 3 days",
  "author": "Jane Editor",
  "changeNotes": "Updated based on team feedback"
}
```

### 3.7 Mark Document as Verified
```
POST http://localhost:4000/api/documents/:id/verify
Content-Type: application/json

{
  "verifiedBy": "compliance-team@company.com"
}
```

---

## 4. Decay Analysis API

### 4.1 Analyze Single Document
```
POST http://localhost:4000/api/decay/analyze
Content-Type: application/json

{
  "documentId": "your-document-uuid-here"
}
```

**Expected Response:**
```json
{
  "analysisId": "analysis-uuid",
  "documentId": "your-document-uuid",
  "decay_detected": true,
  "confidence_score": 0.65,
  "risk_level": "medium",
  "decay_reasons": [
    {
      "type": "time",
      "description": "Document last updated 95 days ago (threshold: 30 days for SOP)",
      "sources": []
    }
  ],
  "what_changed_summary": "The document has not been reviewed in 95 days, exceeding the standard review period for SOP documents.",
  "update_recommendations": [
    {
      "section": "Document Review Required",
      "suggested_text": "[REVIEW NEEDED] This SOP was last updated 95 days ago. Please verify all procedures are still accurate."
    }
  ],
  "citations": [],
  "analyzedAt": "2026-01-29T14:00:00.000Z"
}
```

### 4.2 Batch Analyze Documents
```
POST http://localhost:4000/api/decay/batch
Content-Type: application/json

{
  "workspaceId": "ws-test-001"
}
```

**Or analyze specific documents:**
```json
{
  "documentIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### 4.3 Get Decay Reports
```
GET http://localhost:4000/api/decay/reports
```

**Query Parameters (optional):**
- `workspaceId` - Filter by workspace
- `decayDetected` - Filter by decay status (true/false)
- `riskLevel` - Filter by risk (low, medium, high)
- `reviewStatus` - Filter by review status (pending, approved, rejected, updated)
- `limit` - Number of results
- `offset` - Pagination

**Examples:**
```
GET http://localhost:4000/api/decay/reports?decayDetected=true&riskLevel=high
GET http://localhost:4000/api/decay/reports?reviewStatus=pending
```

### 4.4 Get Single Report
```
GET http://localhost:4000/api/decay/reports/:id
```

### 4.5 Update Report Review Status
```
PATCH http://localhost:4000/api/decay/reports/:id/review
Content-Type: application/json

{
  "status": "approved",
  "reviewedBy": "manager@company.com",
  "notes": "Verified content is still accurate. No updates needed."
}
```

**Valid status values:** `pending`, `approved`, `rejected`, `updated`

### 4.6 Get Decay Summary
```
GET http://localhost:4000/api/decay/summary?workspaceId=ws-test-001
```

**Expected Response:**
```json
{
  "workspaceId": "ws-test-001",
  "totalDocuments": 25,
  "analyzedDocuments": 20,
  "decayDetected": 8,
  "byRiskLevel": {
    "high": 2,
    "medium": 4,
    "low": 2
  },
  "byReviewStatus": {
    "pending": 6,
    "approved": 1,
    "rejected": 0,
    "updated": 1
  },
  "averageConfidenceScore": 0.72
}
```

---

## 5. Document Types

| Type | Warning Days | Critical Days |
|------|-------------|---------------|
| SOP | 30 | 90 |
| Policy | 60 | 180 |
| Guide | 90 | 365 |
| Spec | 45 | 120 |
| Notes | 180 | 365 |

---

## 6. Risk Levels

| Risk Level | Confidence Score |
|------------|------------------|
| low | 0.7 - 1.0 |
| medium | 0.4 - 0.7 |
| high | 0.0 - 0.4 |

---

## 7. Error Responses

**400 Bad Request:**
```json
{
  "error": "Validation Error",
  "message": "documentId is required"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Document not found"
}
```

**500 Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

---

## 8. Testing Flow

1. **Create 2-3 documents** with different types
2. **Create a version** for one document  
3. **Analyze all documents** using batch endpoint
4. **Get decay reports** and filter by risk level
5. **Update review status** to mark as approved/rejected
6. **Get summary** to see workspace health

---

## 9. Postman Collection Import

Create these requests in Postman:
1. Health Check - GET `/health`
2. Create Document - POST `/api/documents`
3. List Documents - GET `/api/documents`
4. Analyze Document - POST `/api/decay/analyze`
5. Batch Analyze - POST `/api/decay/batch`
6. Get Reports - GET `/api/decay/reports`
7. Get Summary - GET `/api/decay/summary`

Set `{{base_url}}` variable to `http://localhost:4000`
