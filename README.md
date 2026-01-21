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
   cp .env.example .env
   # Edit .env and add your QDRANT_API_KEY if using cloud Qdrant
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   docker run -p 6333:6333 -v "$(pwd)/qdrant_storage:/qdrant/storage" qdrant/qdrant
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
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
