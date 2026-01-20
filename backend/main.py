from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "radiology_memory")

# Initialize Qdrant client
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

# Load BioMedCLIP model
print("🏥 Loading Microsoft BioMedCLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
tokenizer = open_clip.get_tokenizer('hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224')

@app.post("/upload-scan")
async def upload_scan(file: UploadFile = File(...)):
    """
    Upload a medical scan image, generate embeddings, and store in Qdrant.
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

        # For now, use a placeholder text (could be enhanced to accept metadata)
        placeholder_text = "Medical scan uploaded"
        text_tokens = tokenizer([placeholder_text])

        with torch.no_grad():
            img_features = model.encode_image(image)
            img_features /= img_features.norm(dim=-1, keepdim=True)

            txt_features = model.encode_text(text_tokens)
            txt_features /= txt_features.norm(dim=-1, keepdim=True)

        # Prepare payload
        scan_id = str(uuid.uuid4())
        payload = {
            "scan_id": scan_id,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": str(file_path),
            "upload_timestamp": datetime.now().isoformat(),
            "report_text": placeholder_text,
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

        # Upsert to Qdrant
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=[point])

        return {
            "success": True,
            "scan_id": scan_id,
            "filename": unique_filename,
            "message": "Scan uploaded and indexed successfully"
        }

    except Exception as e:
        # Clean up file if something went wrong
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
