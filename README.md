# Radiology-RAG-Convolve

A full-stack radiology image analysis application with RAG (Retrieval-Augmented Generation) capabilities. Upload medical scans, generate embeddings using BioMedCLIP, and store them in Qdrant for semantic search and analysis.

## Features

- **Image Upload**: Drag-and-drop interface for uploading DICOM/X-Ray images
- **BioMedCLIP Integration**: Uses Microsoft's BioMedCLIP model for generating medical image embeddings
- **Vector Storage**: Stores image and text embeddings in Qdrant vector database
- **Modern UI**: React frontend with TypeScript, Tailwind CSS, and shadcn/ui components
- **FastAPI Backend**: Python backend with automatic CORS handling

### 🆕 Patient Memory System
- **Patient-wise Scan History**: Every uploaded scan is stored and indexed per patient
- **Chat History Persistence**: Conversations about each scan are saved and can be resumed
- **Historical Scan Viewer**: View any previous scan directly from the timeline

### 🤖 Intelligent RAG Chat Assistant
The AI assistant supports **three types of intents**:

| Intent | Description | Example Query |
|--------|-------------|---------------|
| 🔬 **Diagnose** | Global RAG scan analysis using 3500+ verified radiology reports | *"Analyze this scan and provide findings"* |
| 📋 **Fetch** | Semantic search to retrieve specific historical scans | *"Show my lung scan from last year February"* |
| 📊 **Compare** | Compare current scan with historical ones | *"Compare this scan with my previous one and tell how I've improved"* |

### 🧠 LLM-Powered Analysis
- **Gemini 1.5 Flash** integration for intelligent reasoning
- RAG pipeline fetches similar cases from knowledge base
- Generates detailed diagnostic reports with clinical observations

## Repository Structure

- `backend/`                # FastAPI backend service
  - `main.py`              # Main API application
  - `Dockerfile`           # Backend container configuration
  - `uploads/`             # Uploaded images (gitignored)
- `frontend/`              # React frontend application
  - `src/`                 # Source code
  - `Dockerfile`           # Frontend container configuration
- `data/`                  # Data processing and ingestion scripts
- `docs/`                  # Documentation
- `.env.example`           # Environment variables template
- `docker-compose.yaml`    # Multi-service orchestration
- `requirements.txt`       # Python dependencies

## Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd radiology-rag-convolve
   ```

2. **Set up environment variables**
   ```bash
   cd Radiology-RAG-Convolve
   cp .env.example .env
   Include GEMINI_API_KEY in the .env
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000
   - Qdrant Dashboard: http://localhost:6333/dashboard

## Local Development

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Setup
```bash
# Start Qdrant locally
docker-compose up qdrant -d

# Or use cloud Qdrant by setting QDRANT_URL in .env
```

## Usage

1. **Upload Scans**: Use the drag-and-drop interface in the left panel to upload medical images
2. **Automatic Processing**: Images are automatically processed with BioMedCLIP to generate embeddings
3. **Vector Storage**: Embeddings are stored in Qdrant for semantic search capabilities
4. **Analysis**: Use the chat interface for RAG-based analysis of uploaded scans

## API Endpoints

### Core Endpoints
- `POST /upload-scan` - Upload a medical scan image with patient tagging
- `POST /analyze-scan` - RAG-based scan analysis using knowledge base
- `GET /health` - Health check endpoint

### Patient History Endpoints
- `POST /patient-history` - Retrieve all scans for a specific patient
- `GET /scan-image/{filename}` - Serve scan image files
- `POST /update-scan-report` - Update scan findings after analysis

### Chat & Memory Endpoints
- `POST /chat` - Main RAG chat endpoint with intent classification
- `POST /save-chat` - Save chat conversation for a specific scan
- `POST /get-chat-history` - Retrieve chat history for a scan

## Environment Variables

See `.env.example` for required environment variables:

- `QDRANT_URL`: Qdrant instance URL (default: `http://localhost:6333`)
- `QDRANT_API_KEY`: Qdrant API key (optional for local)
- `QDRANT_KNOWLEDGE_COLLECTION`: Collection for verified radiology reports (default: `radiology_memory`)
- `QDRANT_USER_COLLECTION`: Collection for patient uploads (default: `patient_uploads`)
- `GEMINI_API_KEY`: Google Gemini API key for LLM reasoning (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Development Notes

- BioMedCLIP model loads on startup (may take a few minutes)
- Uploaded images are stored in `backend/uploads/`
- Vector embeddings use 512-dimensional space for both image and text
- CORS is configured for local development (ports 5173, 3000)
- Chat histories are stored in a separate `chat_history` Qdrant collection

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│    Qdrant       │
│   (React/TS)    │     │   (FastAPI)     │     │  Vector DB      │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                        │  BioMedCLIP     │
                        │  (Embeddings)   │
                        │                 │
                        └────────┬────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                        │  Gemini LLM     │
                        │  (Reasoning)    │
                        │                 │
                        └─────────────────┘
```

## Collections Structure

| Collection | Purpose | Vectors |
|------------|---------|---------|
| `radiology_memory` | 3500+ verified radiology reports (knowledge base) | image_vector, text_vector |
| `patient_uploads` | Patient-uploaded scans | image_vector, text_vector |
| `chat_history` | Chat conversations per scan | text_vector |
| `medical_history` | Patient medical files (scans, reports, prescriptions) | text_vector |

---

## 📊 Qdrant Data Flow: Ingestion & Retrieval

### Data Ingestion Pipeline

When a user uploads a medical scan, the following pipeline executes:

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│   /upload-scan  │────▶│   BioMedCLIP     │────▶│     Qdrant      │
│  (Drag&Drop) │     │    Endpoint     │     │   Embeddings     │     │   Upsert Point  │
└──────────────┘     └─────────────────┘     └──────────────────┘     └─────────────────┘
```

#### Step 1: File Upload & Validation
```python
# Frontend sends: file, patient_id, scan_type, notes
POST /upload-scan
Content-Type: multipart/form-data
```

#### Step 2: Embedding Generation (BioMedCLIP)
```python
# Image embedding (512-dimensional vector)
image = preprocess(Image.open(file_path)).unsqueeze(0)
img_features = model.encode_image(image)
img_features /= img_features.norm(dim=-1, keepdim=True)  # L2 normalization

# Text embedding (512-dimensional vector)
placeholder_text = f"Medical {scan_type} scan uploaded by patient. {notes}"
text_tokens = tokenizer([placeholder_text])
txt_features = model.encode_text(text_tokens)
txt_features /= txt_features.norm(dim=-1, keepdim=True)  # L2 normalization
```

#### Step 3: Qdrant Point Structure

**Payload Schema for `patient_uploads` Collection:**
```json
{
  "patient_id": "PID1",
  "status": "uploaded",
  "scan_id": "uuid-string",
  "scan_type": "CXR",
  "filename": "unique-uuid.jpg",
  "original_filename": "chest_xray.png",
  "file_path": "uploads/unique-uuid.jpg",
  "upload_timestamp": "2024-01-15T10:30:00.000Z",
  "upload_date": "Jan 2024",
  "upload_date_full": "2024-01-15",
  "report_text": "Pending analysis",
  "notes": "User notes here",
  "file_size": 245000,
  "content_type": "image/png",
  "has_chat_history": false
}
```

**Vector Configuration:**
```python
vectors_config={
    "image_vector": VectorParams(size=512, distance=Distance.COSINE),
    "text_vector": VectorParams(size=512, distance=Distance.COSINE),
}
```

#### Step 4: Upsert to Qdrant
```python
point = models.PointStruct(
    id=scan_id,  # UUID string
    vector={
        "image_vector": img_features.squeeze().tolist(),  # [512 floats]
        "text_vector": txt_features.squeeze().tolist()    # [512 floats]
    },
    payload=payload
)
qdrant_client.upsert(collection_name="patient_uploads", points=[point])
```

---

### Data Retrieval Mechanisms

#### 1. Payload Filtering (Exact Match)

Used for retrieving all scans belonging to a specific patient:

```python
# Get all scans for patient PID1
results = qdrant_client.scroll(
    collection_name="patient_uploads",
    scroll_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="patient_id",
                match=models.MatchValue(value="PID1")
            )
        ]
    ),
    limit=100,
    with_payload=True,
    with_vectors=False
)
```

**Indexed Fields for Fast Filtering:**
- `patient_id` (KEYWORD index)
- `scan_id` (KEYWORD index)
- `scan_type` (KEYWORD index)

#### 2. Vector Similarity Search

Used for finding visually similar cases from the knowledge base:

```python
# Query: Find similar cases using image embedding
search_results = qdrant_client.query_points(
    collection_name="radiology_memory",
    query=user_image_vector,      # 512-dim vector from uploaded scan
    using="image_vector",          # Search against image embeddings
    limit=5                        # Top 5 most similar
).points

# Results contain similarity scores (0.0 to 1.0 for COSINE)
for hit in search_results:
    print(f"Score: {hit.score}, Report: {hit.payload['report_text']}")
```

#### 3. Hybrid Search (Filtering + Similarity)

Used for semantic search within a patient's own scans:

```python
# Find patient's scan matching a text description
search_results = qdrant_client.query_points(
    collection_name="patient_uploads",
    query=text_embedding,          # Embedding of user's query
    using="text_vector",           # Search against text embeddings
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="patient_id",
                match=models.MatchValue(value="PID1")
            )
        ],
        must_not=[
            models.FieldCondition(
                key="scan_id",
                match=models.MatchValue(value="current-scan-id")
            )
        ]
    ),
    limit=3
).points
```

---

## 🔬 Feature Workflows

### Feature 1: Global RAG Diagnosis (Diagnose Intent)

**Trigger:** User asks to analyze/diagnose a scan  
**Example:** *"Analyze this scan and provide findings"*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL RAG DIAGNOSIS FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Intent Classification
┌──────────────────┐
│  User Message    │──▶ classify_intent() ──▶ {"intent": "diagnose", "confidence": 0.9}
│  "Analyze scan"  │
└──────────────────┘

Step 2: Retrieve User's Scan Vector
┌──────────────────┐
│  patient_uploads │──▶ qdrant.retrieve(scan_id) ──▶ image_vector [512 floats]
│   Collection     │
└──────────────────┘

Step 3: Search Knowledge Base (RAG)
┌──────────────────┐     ┌────────────────────────────────────────┐
│ radiology_memory │◀────│ query_points(image_vector, limit=5)    │
│  (3500+ cases)   │     │ using="image_vector"                   │
└──────────────────┘     └────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Similar Cases Found:                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Case 1: Score 0.92 - "Bilateral infiltrates suggesting..."  │ │
│ │ Case 2: Score 0.87 - "Cardiomegaly with pulmonary edema..." │ │
│ │ Case 3: Score 0.84 - "Normal cardiac silhouette..."         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Step 4: LLM Reasoning (Gemini)
┌─────────────────────────────────────────────────────────────────┐
│ Prompt to Gemini:                                                │
│ "You are an expert radiologist AI assistant.                     │
│  Based on visual similarity analysis, here are similar cases:    │
│  [Case 1, Case 2, Case 3]                                        │
│  Provide detailed radiological analysis..."                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  AI Response     │──▶ Structured analysis with findings & recommendations
└──────────────────┘
```

**Response Structure:**
```json
{
  "intent": "diagnose",
  "confidence": 0.9,
  "message": "## Radiological Analysis\n\n### Findings\n...",
  "similar_cases": [
    {"score": 0.92, "report": "Bilateral infiltrates..."},
    {"score": 0.87, "report": "Cardiomegaly..."}
  ]
}
```

---

### Feature 2: Historical Scan Fetching (Fetch Intent)

**Trigger:** User wants to retrieve a specific past scan  
**Example:** *"Show my lung scan from last year February"*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HISTORICAL SCAN FETCH FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Intent Classification
┌────────────────────────┐
│  "Show my lung scan    │──▶ classify_intent() ──▶ {"intent": "fetch", "confidence": 0.85}
│   from February"       │
└────────────────────────┘

Step 2: Generate Query Embedding
┌────────────────────────┐
│  User's natural        │──▶ BioMedCLIP.encode_text() ──▶ query_vector [512 floats]
│  language query        │
└────────────────────────┘

Step 3: Semantic Search with Patient Filter
┌─────────────────────────────────────────────────────────────────┐
│ qdrant_client.query_points(                                      │
│     collection_name="patient_uploads",                           │
│     query=query_vector,                                          │
│     using="text_vector",                                         │
│     query_filter=Filter(                                         │
│         must=[FieldCondition(key="patient_id", match="PID1")]    │
│     ),                                                           │
│     limit=3                                                      │
│ )                                                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Best Match Found:                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ scan_id: "abc-123"                                          │ │
│ │ scan_type: "CXR"                                            │ │
│ │ upload_date: "Feb 2023"                                     │ │
│ │ filename: "lung-scan-uuid.jpg"                              │ │
│ │ similarity_score: 0.89                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Step 4: Return Scan with Image
```

**Response Structure:**
```json
{
  "intent": "fetch",
  "confidence": 0.89,
  "message": "## Found Your Scan\n\n**Scan Type:** CXR\n**Date:** Feb 2023...",
  "images": [{
    "filename": "lung-scan-uuid.jpg",
    "url": "/uploads/lung-scan-uuid.jpg",
    "scan_id": "abc-123",
    "date": "Feb 2023"
  }],
  "scan_data": {
    "scan_id": "abc-123",
    "scan_type": "CXR",
    "date": "Feb 2023",
    "report": "Previous findings..."
  }
}
```

---

### Feature 3: Scan Comparison (Compare Intent)

**Trigger:** User wants to compare current scan with historical one  
**Example:** *"Compare this scan with my previous one and show improvement"*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCAN COMPARISON FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Intent Classification
┌─────────────────────────┐
│  "Compare this scan     │──▶ classify_intent() ──▶ {"intent": "compare", "confidence": 0.9}
│   with my previous"     │
└─────────────────────────┘

Step 2: Retrieve Current Scan
┌──────────────────┐
│  patient_uploads │──▶ qdrant.retrieve(current_scan_id)
│   Collection     │         │
└──────────────────┘         ▼
                    ┌─────────────────────────────────┐
                    │ Current Scan:                   │
                    │ - image_vector                  │
                    │ - payload (date, type, report)  │
                    └─────────────────────────────────┘

Step 3: Find Historical Scan (Semantic Search + Exclusion Filter)
┌─────────────────────────────────────────────────────────────────┐
│ qdrant_client.query_points(                                      │
│     collection_name="patient_uploads",                           │
│     query=text_embedding,                                        │
│     using="text_vector",                                         │
│     query_filter=Filter(                                         │
│         must=[                                                   │
│             FieldCondition(key="patient_id", match="PID1")       │
│         ],                                                       │
│         must_not=[                                               │
│             FieldCondition(key="scan_id", match=current_scan_id) │  ◀── Exclude current
│         ]                                                        │
│     ),                                                           │
│     limit=1                                                      │
│ )                                                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Historical Scan Found:                                           │
│ - scan_id: "xyz-789"                                             │
│ - upload_date: "Jan 2023"                                        │
│ - report_text: "Previous findings..."                            │
└─────────────────────────────────────────────────────────────────┘

Step 4: Compute Visual Similarity (Cosine Distance)
┌─────────────────────────────────────────────────────────────────┐
│ similarity = dot(current_image_vector, historical_image_vector) │
│ similarity_score = 0.85 (85% similar)                            │
└─────────────────────────────────────────────────────────────────┘

Step 5: LLM Comparison Analysis (Gemini)
┌─────────────────────────────────────────────────────────────────┐
│ Prompt to Gemini:                                                │
│ "Compare these two medical scans from the same patient:          │
│                                                                  │
│  CURRENT SCAN (Jan 2024):                                        │
│  - Type: CXR                                                     │
│  - Findings: [current report]                                    │
│                                                                  │
│  PREVIOUS SCAN (Jan 2023):                                       │
│  - Type: CXR                                                     │
│  - Findings: [historical report]                                 │
│                                                                  │
│  Visual Similarity: 85%                                          │
│  Analyze changes and improvements..."                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Comparison Analysis:                                             │
│  - Timeline visualization                                         │
│  - Changes identified                                             │
│  - Improvement assessment                                         │
│  - Both images returned for side-by-side view                     │
└──────────────────────────────────────────────────────────────────┘
```

**Response Structure:**
```json
{
  "intent": "compare",
  "confidence": 0.9,
  "message": "## Scan Comparison Analysis\n\n### Visual Similarity: 85%\n\n### Changes Observed\n...",
  "images": [
    {"filename": "current.jpg", "url": "/uploads/current.jpg", "date": "Jan 2024"},
    {"filename": "previous.jpg", "url": "/uploads/previous.jpg", "date": "Jan 2023"}
  ],
  "comparison": {
    "visual_similarity": 0.85,
    "current_scan": {"id": "...", "date": "Jan 2024"},
    "historical_scan": {"id": "...", "date": "Jan 2023"}
  }
}
```

---

## 🔐 Demo Credentials

| Patient ID | Password | Name |
|------------|----------|------|
| PID1 | AAA | John Doe |
| PID2 | BBB | Jane Smith |
| PID3 | CCC | Robert Johnson |
| PID4 | DDD | Emily Davis |
| PID5 | EEE | Michael Wilson |
| PID6 | FFF | Sarah Anderson |
| PID7 | GGG | David Martinez |
