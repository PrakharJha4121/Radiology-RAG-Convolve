# Radiology-RAG-Convolve

A full-stack radiology image analysis application with RAG (Retrieval-Augmented Generation) capabilities. Upload medical scans, generate embeddings using BioMedCLIP, and store them in Qdrant for semantic search and analysis.

## Features

- **Image Upload**: Drag-and-drop interface for uploading DICOM/X-Ray images
- **BioMedCLIP Integration**: Uses Microsoft's BioMedCLIP model for generating medical image embeddings
- **Vector Storage**: Stores image and text embeddings in Qdrant vector database
- **Modern UI**: React frontend with TypeScript, Tailwind CSS, and shadcn/ui components
- **FastAPI Backend**: Python backend with automatic CORS handling

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

- `POST /upload-scan`: Upload a medical scan image
- `GET /health`: Health check endpoint

## Environment Variables

See `.env.example` for required environment variables:

- `QDRANT_URL`: Qdrant instance URL
- `QDRANT_API_KEY`: Qdrant API key (optional for local)
- `QDRANT_COLLECTION`: Collection name for radiology data

## Development Notes

- BioMedCLIP model loads on startup (may take a few minutes)
- Uploaded images are stored in `backend/uploads/`
- Vector embeddings use 512-dimensional space for both image and text
- CORS is configured for local development (ports 5173, 3000)
