from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from pathlib import Path
import torch
import open_clip
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv
from datetime import datetime
import uuid

# Load environment variables
load_dotenv()

app = FastAPI(title="Radiology Upload API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (fixes your frontend connection issues)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

# --- COLLECTION STRATEGY ---
# 1. KNOWLEDGE BASE: The 3500 verified reports (Read-only for AI diagnosis)
KNOWLEDGE_COLLECTION = os.getenv("QDRANT_KNOWLEDGE_COLLECTION", "radiology_knowledge")
# 2. PATIENT STORAGE: The User/Patient uploads (Write here for history)
USER_COLLECTION = os.getenv("QDRANT_USER_COLLECTION", "patient_uploads")

# Initialize Qdrant client
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

# Load BioMedCLIP model
print("🏥 Loading Microsoft BioMedCLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
tokenizer = open_clip.get_tokenizer('hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224')

# --- DATA MODELS ---

class AnalysisRequest(BaseModel):
    scan_id: str

# --- ENDPOINTS ---

@app.post("/upload-scan")
async def upload_scan(
    file: UploadFile = File(...),
    patient_id: str = Form(...)  # Accepts patient_id from the frontend
):
    """
    Upload a medical scan, tag it with patient_id, and save to 'patient_uploads'.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Generate unique filename
        file_extension = Path(file.filename).suffix or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Generate embeddings
        image = preprocess(Image.open(file_path)).unsqueeze(0)

        # Placeholder text for the embedding (since this is a raw upload)
        placeholder_text = "Medical scan uploaded by patient"
        text_tokens = tokenizer([placeholder_text])

        with torch.no_grad():
            img_features = model.encode_image(image)
            img_features /= img_features.norm(dim=-1, keepdim=True)

            txt_features = model.encode_text(text_tokens)
            txt_features /= txt_features.norm(dim=-1, keepdim=True)

        # Prepare payload
        scan_id = str(uuid.uuid4())
        payload = {
            "patient_id": patient_id,     # Tagging the user
            "status": "raw",              # Mark as raw so it's not used for training yet
            "scan_id": scan_id,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": str(file_path),
            "upload_timestamp": datetime.now().isoformat(),
            "report_text": "Pending analysis",
            "file_size": file_path.stat().st_size,
            "content_type": file.content_type
        }

        # Create point for Qdrant
        point = models.PointStruct(
            id=scan_id,
            vector={
                "image_vector": img_features.squeeze().tolist(),
                "text_vector": txt_features.squeeze().tolist()
            },
            payload=payload
        )

        # Upsert to the USER collection (Keeps knowledge base clean)
        qdrant_client.upsert(
            collection_name=USER_COLLECTION, 
            points=[point]
        )

        return {
            "success": True,
            "scan_id": scan_id,
            "filename": unique_filename,
            "message": "Scan uploaded and saved to patient records."
        }

    except Exception as e:
        # Clean up file if something went wrong
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        print(f"Error: {str(e)}") # Print error to terminal for debugging
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/analyze-scan")
async def analyze_scan(request: AnalysisRequest):
    """
    RAG Logic:
    1. Retrieve the vector of the user's uploaded scan (from patient_uploads).
    2. Search the KNOWLEDGE BASE (radiology_knowledge) for visually similar confirmed cases.
    3. Return the diagnosis candidates.
    """
    try:
        # 1. Get the User's Image Vector
        user_record = qdrant_client.retrieve(
            collection_name=USER_COLLECTION,
            ids=[request.scan_id],
            with_vectors=True
        )
        
        if not user_record:
            raise HTTPException(status_code=404, detail="Scan not found in patient records")
            
        # Extract the image vector
        user_image_vector = user_record[0].vector['image_vector']

        # 2. Search the KNOWLEDGE COLLECTION (The 3500 Experts)
        # We search for "visually similar" images in our gold-standard database
        search_results = qdrant_client.search(
            collection_name=KNOWLEDGE_COLLECTION,
            query_vector=user_image_vector,
            limit=3  # Get the top 3 most similar cases
        )

        # 3. Format the results for the frontend
        similar_cases = []
        for hit in search_results:
            similar_cases.append({
                "similarity_score": round(hit.score, 4), # Confidence score
                "diagnosis_report": hit.payload.get("report_text", "No report text available"),
                "reference_case_id": hit.payload.get("scan_id", "Unknown")
            })

        return {
            "status": "success",
            "reasoning": "Diagnosis generated based on visual similarity to confirmed past cases.",
            "candidates": similar_cases
        }

    except Exception as e:
        print(f"Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)