import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Constants
MEDICAL_HISTORY_COLLECTION = "medical_history"

def ensure_medical_history_collection(qdrant_client: QdrantClient):
    if not qdrant_client.collection_exists(MEDICAL_HISTORY_COLLECTION):
        qdrant_client.create_collection(
            collection_name=MEDICAL_HISTORY_COLLECTION,
            vectors_config={
                "text_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
            }
        )
        for field in ["patient_id", "path", "item_type", "report_date", "status"]:
            qdrant_client.create_payload_index(
                collection_name=MEDICAL_HISTORY_COLLECTION,
                field_name=field,
                field_schema=models.PayloadSchemaType.KEYWORD
            )
        print(f"✅ Created collection: {MEDICAL_HISTORY_COLLECTION}")

def create_medical_folder(
    qdrant_client: QdrantClient,
    text_embedding_vector: List[float],
    patient_id: str,
    report_date: str,
    image_filename: str,
    ai_analysis: str,
    prescription: str,
    diagnosis: str,
    messages: List[Dict[str, str]],
    provenance: Dict[str, Any],
    image_vector_pointer: Optional[str] = None,
    folder_id: Optional[str] = None,
    status: str = "completed"
) -> str:
    
    if not folder_id:
        folder_id = str(uuid.uuid4())
        
    timestamp = datetime.now().isoformat()
    
    # ✅ FIX: Adds time to folder name
    current_time = datetime.now().strftime("%H:%M:%S")
    folder_name = f"Consultation {report_date} {current_time}"

    payload = {
        "patient_id": patient_id,
        "item_type": "folder", 
        "name": folder_name,
        "path": folder_name,
        "parent_path": "",
        "updated_at": timestamp,
        "status": status,
        "report_date": report_date,
        "diagnosis": diagnosis,
        "prescription": prescription,
        "ai_analysis": ai_analysis,
        "image_metadata": {
            "filename": image_filename,
            "image_vector_pointer": image_vector_pointer,
        },
        "messages": messages,
        "provenance": provenance,
    }

    # Simplified created_at logic
    payload["created_at"] = timestamp 

    qdrant_client.upsert(
        collection_name=MEDICAL_HISTORY_COLLECTION,
        points=[
            models.PointStruct(
                id=folder_id,
                vector={"text_vector": text_embedding_vector},
                payload=payload,
            )
        ],
    )
    return folder_id