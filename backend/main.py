from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
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
import json
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = FastAPI(title="Radiology RAG API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    llm_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    llm_model = None
    print("⚠️ Warning: GEMINI_API_KEY not set. LLM features will be limited.")

# --- COLLECTION STRATEGY ---
KNOWLEDGE_COLLECTION = os.getenv("QDRANT_KNOWLEDGE_COLLECTION", "radiology_memory")
USER_COLLECTION = os.getenv("QDRANT_USER_COLLECTION", "patient_uploads")
CHAT_COLLECTION = "chat_history"

# Initialize Qdrant client
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

# Ensure collections exist and have required indexes
def ensure_collections():
    """Ensure all required collections exist with proper indexes"""
    try:
        # User uploads collection
        if not qdrant_client.collection_exists(USER_COLLECTION):
            qdrant_client.create_collection(
                collection_name=USER_COLLECTION,
                vectors_config={
                    "image_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
                    "text_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
                }
            )
            print(f"✅ Created collection: {USER_COLLECTION}")
        
        # Create payload indexes for patient_uploads collection
        try:
            qdrant_client.create_payload_index(
                collection_name=USER_COLLECTION,
                field_name="patient_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            print(f"✅ Created patient_id index on {USER_COLLECTION}")
        except Exception as idx_e:
            # Index might already exist
            if "already exists" not in str(idx_e).lower():
                print(f"⚠️ Index warning: {idx_e}")
        
        try:
            qdrant_client.create_payload_index(
                collection_name=USER_COLLECTION,
                field_name="scan_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            print(f"✅ Created scan_id index on {USER_COLLECTION}")
        except Exception as idx_e:
            if "already exists" not in str(idx_e).lower():
                print(f"⚠️ Index warning: {idx_e}")
        
        # Chat history collection (using text vectors for semantic search)
        if not qdrant_client.collection_exists(CHAT_COLLECTION):
            qdrant_client.create_collection(
                collection_name=CHAT_COLLECTION,
                vectors_config={
                    "text_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
                }
            )
            print(f"✅ Created collection: {CHAT_COLLECTION}")
        
        # Create payload indexes for chat_history collection
        try:
            qdrant_client.create_payload_index(
                collection_name=CHAT_COLLECTION,
                field_name="patient_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            print(f"✅ Created patient_id index on {CHAT_COLLECTION}")
        except Exception as idx_e:
            if "already exists" not in str(idx_e).lower():
                print(f"⚠️ Index warning: {idx_e}")
        
        try:
            qdrant_client.create_payload_index(
                collection_name=CHAT_COLLECTION,
                field_name="scan_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            print(f"✅ Created scan_id index on {CHAT_COLLECTION}")
        except Exception as idx_e:
            if "already exists" not in str(idx_e).lower():
                print(f"⚠️ Index warning: {idx_e}")
                
    except Exception as e:
        print(f"⚠️ Collection setup warning: {e}")

ensure_collections()

# Load BioMedCLIP model
print("🏥 Loading Microsoft BioMedCLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BioMedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
tokenizer = open_clip.get_tokenizer('hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224')

# Mount uploads folder for serving images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- DATA MODELS ---

class AnalysisRequest(BaseModel):
    scan_id: str

class ChatMessage(BaseModel):
    patient_id: str
    scan_id: Optional[str] = None
    message: str
    current_scan_id: Optional[str] = None  # Currently uploaded scan being discussed

class SaveChatRequest(BaseModel):
    patient_id: str
    scan_id: str
    messages: List[dict]

class GetHistoryRequest(BaseModel):
    patient_id: str

class GetChatHistoryRequest(BaseModel):
    patient_id: str
    scan_id: str

# --- HELPER FUNCTIONS ---

def get_text_embedding(text: str):
    """Generate text embedding using BioMedCLIP"""
    text_tokens = tokenizer([text])
    with torch.no_grad():
        txt_features = model.encode_text(text_tokens)
        txt_features /= txt_features.norm(dim=-1, keepdim=True)
    return txt_features.squeeze().tolist()

def get_image_embedding(image_path: str):
    """Generate image embedding using BioMedCLIP"""
    image = preprocess(Image.open(image_path)).unsqueeze(0)
    with torch.no_grad():
        img_features = model.encode_image(image)
        img_features /= img_features.norm(dim=-1, keepdim=True)
    return img_features.squeeze().tolist()

def classify_intent(message: str) -> dict:
    """
    Classify user intent into one of three categories:
    1. diagnose - Study/diagnose a scan using global RAG
    2. fetch - Fetch a specific historical scan
    3. compare - Compare current scan with historical scan
    """
    message_lower = message.lower()
    
    # Keywords for comparison
    compare_keywords = ['compare', 'comparison', 'difference', 'improved', 'changed', 'previous', 'before and after', 'progress', 'vs', 'versus']
    
    # Keywords for fetching
    fetch_keywords = ['fetch', 'get', 'show', 'find', 'retrieve', 'last year', 'february', 'march', 'january', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'my scan', 'my previous', 'history']
    
    # Keywords for diagnosis
    diagnose_keywords = ['diagnose', 'diagnosis', 'study', 'analyze', 'analyse', 'what is', 'findings', 'report', 'tell me about', 'examine', 'evaluate']
    
    # Check for comparison intent first (most specific)
    if any(kw in message_lower for kw in compare_keywords):
        return {"intent": "compare", "confidence": 0.9}
    
    # Check for fetch intent
    if any(kw in message_lower for kw in fetch_keywords) and not any(kw in message_lower for kw in diagnose_keywords):
        return {"intent": "fetch", "confidence": 0.85}
    
    # Default to diagnose
    return {"intent": "diagnose", "confidence": 0.8}

def generate_llm_response(prompt: str, context: str = "") -> str:
    """Generate response using Gemini LLM"""
    if not llm_model:
        return "LLM not configured. Please set GEMINI_API_KEY environment variable."
    
    try:
        full_prompt = f"""You are an expert radiologist AI assistant. 
{context}

User Query: {prompt}

Provide a detailed, professional medical response. Use markdown formatting for clarity.
Include relevant clinical observations, potential diagnoses, and recommendations when appropriate.
Always remind that final interpretation should be by a qualified radiologist."""
        
        response = llm_model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return f"Error generating response: {str(e)}"

# --- ENDPOINTS ---

@app.post("/upload-scan")
async def upload_scan(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    scan_type: str = Form(default="CXR"),
    notes: str = Form(default="")
):
    """
    Upload a medical scan with patient tagging and automatic embedding generation.
    """
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        file_extension = Path(file.filename).suffix or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Generate embeddings
        image = preprocess(Image.open(file_path)).unsqueeze(0)
        placeholder_text = f"Medical {scan_type} scan uploaded by patient. {notes}"
        text_tokens = tokenizer([placeholder_text])

        with torch.no_grad():
            img_features = model.encode_image(image)
            img_features /= img_features.norm(dim=-1, keepdim=True)
            txt_features = model.encode_text(text_tokens)
            txt_features /= txt_features.norm(dim=-1, keepdim=True)

        scan_id = str(uuid.uuid4())
        upload_timestamp = datetime.now()
        
        payload = {
            "patient_id": patient_id,
            "status": "uploaded",
            "scan_id": scan_id,
            "scan_type": scan_type,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": str(file_path),
            "upload_timestamp": upload_timestamp.isoformat(),
            "upload_date": upload_timestamp.strftime("%b %Y"),
            "upload_date_full": upload_timestamp.strftime("%Y-%m-%d"),
            "report_text": notes or "Pending analysis",
            "notes": notes,
            "file_size": file_path.stat().st_size,
            "content_type": file.content_type,
            "has_chat_history": False
        }

        point = models.PointStruct(
            id=scan_id,
            vector={
                "image_vector": img_features.squeeze().tolist(),
                "text_vector": txt_features.squeeze().tolist()
            },
            payload=payload
        )

        qdrant_client.upsert(collection_name=USER_COLLECTION, points=[point])

        return {
            "success": True,
            "scan_id": scan_id,
            "filename": unique_filename,
            "upload_timestamp": upload_timestamp.isoformat(),
            "message": "Scan uploaded and saved to patient records."
        }

    except Exception as e:
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/patient-history")
async def get_patient_history(request: GetHistoryRequest):
    """
    Retrieve all scans for a specific patient.
    """
    try:
        # Search for all scans belonging to this patient
        results = qdrant_client.scroll(
            collection_name=USER_COLLECTION,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="patient_id",
                        match=models.MatchValue(value=request.patient_id)
                    )
                ]
            ),
            limit=100,
            with_payload=True,
            with_vectors=False
        )
        
        scans = []
        for point in results[0]:
            payload = point.payload
            scans.append({
                "id": payload.get("scan_id"),
                "date": payload.get("upload_date", "Unknown"),
                "date_full": payload.get("upload_date_full", ""),
                "type": payload.get("scan_type", "CXR"),
                "title": f"{payload.get('scan_type', 'Medical')} Scan",
                "finding": payload.get("report_text", "Pending analysis"),
                "status": "normal",  # Could be computed from analysis
                "filename": payload.get("filename"),
                "has_chat_history": payload.get("has_chat_history", False),
                "upload_timestamp": payload.get("upload_timestamp")
            })
        
        # Sort by upload timestamp (newest first)
        scans.sort(key=lambda x: x.get("upload_timestamp", ""), reverse=True)
        
        return {"success": True, "scans": scans}
        
    except Exception as e:
        print(f"Error fetching patient history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/scan-image/{filename}")
async def get_scan_image(filename: str):
    """Serve a scan image file"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@app.post("/analyze-scan")
async def analyze_scan(request: AnalysisRequest):
    """
    RAG-based scan analysis using the knowledge base.
    """
    try:
        # Get the user's image vector
        user_record = qdrant_client.retrieve(
            collection_name=USER_COLLECTION,
            ids=[request.scan_id],
            with_vectors=True
        )
        
        if not user_record:
            raise HTTPException(status_code=404, detail="Scan not found")
            
        user_image_vector = user_record[0].vector['image_vector']

        # Search the knowledge collection
        search_results = qdrant_client.query_points(
            collection_name=KNOWLEDGE_COLLECTION,
            query=user_image_vector,
            using="image_vector",
            limit=5
        ).points

        similar_cases = []
        context_reports = []
        
        for hit in search_results:
            report_text = hit.payload.get("report_text", "No report available")
            similar_cases.append({
                "similarity_score": round(hit.score, 4),
                "diagnosis_report": report_text,
                "reference_case_id": hit.payload.get("scan_id", "Unknown")
            })
            context_reports.append(f"Similar Case (Score: {hit.score:.2f}):\n{report_text}")

        # Generate LLM analysis
        context = f"""Based on visual similarity analysis of the uploaded scan, here are the most similar cases from our verified radiology database:

{chr(10).join(context_reports[:3])}

Use these similar cases to provide a comprehensive analysis."""

        llm_analysis = generate_llm_response(
            "Provide a detailed radiological analysis and preliminary findings based on the similar cases found.",
            context
        )

        return {
            "status": "success",
            "analysis": llm_analysis,
            "similar_cases": similar_cases,
            "reasoning": "Analysis generated using RAG with BioMedCLIP embeddings and Gemini LLM."
        }

    except Exception as e:
        print(f"Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/chat")
async def chat_endpoint(request: ChatMessage):
    """
    Main chat endpoint with intent classification and RAG pipeline.
    Handles three types of intents:
    1. diagnose - Global RAG scan diagnosis
    2. fetch - Fetch specific patient scan
    3. compare - Compare current and historical scans
    """
    try:
        print("Classifying intent...")
        intent_result = classify_intent(request.message)
        intent = intent_result["intent"]
        
        response_data = {
            "intent": intent,
            "confidence": intent_result["confidence"],
            "message": "",
            "images": [],
            "scan_data": None
        }
        
        if intent == "diagnose":
            # Global RAG diagnosis
            response_data = await handle_diagnose_intent(request)
            
        elif intent == "fetch":
            # Fetch specific historical scan
            response_data = await handle_fetch_intent(request)
            
        elif intent == "compare":
            # Compare scans
            response_data = await handle_compare_intent(request)
        
        return response_data
        
    except Exception as e:
        print(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

async def handle_diagnose_intent(request: ChatMessage) -> dict:
    """Handle diagnosis intent - RAG across knowledge base"""
    try:
        # Get the current scan's vector if available
        if request.current_scan_id:
            user_record = qdrant_client.retrieve(
                collection_name=USER_COLLECTION,
                ids=[request.current_scan_id],
                with_vectors=True
            )
            
            if user_record:
                image_vector = user_record[0].vector['image_vector']
                
                # Search knowledge base
                search_results = qdrant_client.query_points(
                    collection_name=KNOWLEDGE_COLLECTION,
                    query=image_vector,
                    using="image_vector",
                    limit=5
                ).points
                
                context_reports = []
                for hit in search_results:
                    report = hit.payload.get("report_text", "")
                    context_reports.append(f"**Similar Case (Similarity: {hit.score:.1%})**:\n{report}\n")
                
                context = f"""You are analyzing a medical scan. Based on visual similarity, here are the most relevant cases from our verified radiology database:

{chr(10).join(context_reports[:3])}

The user asked: {request.message}"""
                
                llm_response = generate_llm_response(request.message, context)
                
                return {
                    "intent": "diagnose",
                    "confidence": 0.9,
                    "message": llm_response,
                    "images": [],
                    "scan_data": None,
                    "similar_cases": [{"score": hit.score, "report": hit.payload.get("report_text", "")[:200]} for hit in search_results[:3]]
                }
        
        # If no current scan, use text-based search
        text_vector = get_text_embedding(request.message)
        
        search_results = qdrant_client.query_points(
            collection_name=KNOWLEDGE_COLLECTION,
            query=text_vector,
            using="text_vector",
            limit=3
        ).points
        
        context_reports = [hit.payload.get("report_text", "") for hit in search_results]
        context = f"Relevant medical reports:\n\n" + "\n\n".join(context_reports)
        
        llm_response = generate_llm_response(request.message, context)
        
        return {
            "intent": "diagnose",
            "confidence": 0.8,
            "message": llm_response,
            "images": [],
            "scan_data": None
        }
        
    except Exception as e:
        return {
            "intent": "diagnose",
            "confidence": 0.5,
            "message": f"I encountered an issue while analyzing: {str(e)}. Please try again.",
            "images": [],
            "scan_data": None
        }

async def handle_fetch_intent(request: ChatMessage) -> dict:
    """Handle fetch intent - Find specific patient scan by semantic search"""
    try:
        # Generate embedding for the user's query
        query_vector = get_text_embedding(request.message)
        
        # Search patient's scans with semantic matching
        search_results = qdrant_client.query_points(
            collection_name=USER_COLLECTION,
            query=query_vector,
            using="text_vector",
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="patient_id",
                        match=models.MatchValue(value=request.patient_id)
                    )
                ]
            ),
            limit=3
        ).points
        
        if not search_results:
            return {
                "intent": "fetch",
                "confidence": 0.7,
                "message": "I couldn't find any scans matching your description in your history. Please try different keywords or check your scan history panel.",
                "images": [],
                "scan_data": None
            }
        
        # Get the best match
        best_match = search_results[0]
        payload = best_match.payload
        
        # Format response
        scan_info = f"""## Found Your Scan

**Scan Type:** {payload.get('scan_type', 'Medical Scan')}  
**Date:** {payload.get('upload_date', 'Unknown')}  
**Similarity Score:** {best_match.score:.1%}

### Findings
{payload.get('report_text', 'No findings recorded')}

---
*Click the image to view in full resolution.*"""
        
        return {
            "intent": "fetch",
            "confidence": best_match.score,
            "message": scan_info,
            "images": [{
                "filename": payload.get("filename"),
                "url": f"/uploads/{payload.get('filename')}",
                "scan_id": payload.get("scan_id"),
                "date": payload.get("upload_date")
            }],
            "scan_data": {
                "scan_id": payload.get("scan_id"),
                "scan_type": payload.get("scan_type"),
                "date": payload.get("upload_date"),
                "report": payload.get("report_text")
            }
        }
        
    except Exception as e:
        return {
            "intent": "fetch",
            "confidence": 0.5,
            "message": f"Error fetching scan: {str(e)}",
            "images": [],
            "scan_data": None
        }

async def handle_compare_intent(request: ChatMessage) -> dict:
    """Handle compare intent - Compare current and historical scans"""
    try:
        if not request.current_scan_id:
            return {
                "intent": "compare",
                "confidence": 0.7,
                "message": "To compare scans, please first upload or select a current scan to compare against.",
                "images": [],
                "scan_data": None
            }
        
        # Get current scan
        current_record = qdrant_client.retrieve(
            collection_name=USER_COLLECTION,
            ids=[request.current_scan_id],
            with_vectors=True,
            with_payload=True
        )
        
        if not current_record:
            return {
                "intent": "compare",
                "confidence": 0.5,
                "message": "Could not find the current scan. Please try uploading again.",
                "images": [],
                "scan_data": None
            }
        
        current_payload = current_record[0].payload
        current_image_vector = current_record[0].vector['image_vector']
        
        # Find previous scan using semantic search on user's message
        query_vector = get_text_embedding(request.message)
        
        historical_results = qdrant_client.query_points(
            collection_name=USER_COLLECTION,
            query=query_vector,
            using="text_vector",
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="patient_id",
                        match=models.MatchValue(value=request.patient_id)
                    )
                ],
                must_not=[
                    models.FieldCondition(
                        key="scan_id",
                        match=models.MatchValue(value=request.current_scan_id)
                    )
                ]
            ),
            limit=1
        ).points
        
        if not historical_results:
            return {
                "intent": "compare",
                "confidence": 0.6,
                "message": "I couldn't find a previous scan to compare with. Please ensure you have historical scans uploaded.",
                "images": [],
                "scan_data": None
            }
        
        historical_payload = historical_results[0].payload
        historical_scan_id = historical_payload.get("scan_id")
        
        # Get historical scan vector
        historical_record = qdrant_client.retrieve(
            collection_name=USER_COLLECTION,
            ids=[historical_scan_id],
            with_vectors=True
        )
        
        historical_image_vector = historical_record[0].vector['image_vector']
        
        # RAG: Get similar cases for both scans from knowledge base
        current_similar = qdrant_client.query_points(
            collection_name=KNOWLEDGE_COLLECTION,
            query=current_image_vector,
            using="image_vector",
            limit=2
        ).points
        
        historical_similar = qdrant_client.query_points(
            collection_name=KNOWLEDGE_COLLECTION,
            query=historical_image_vector,
            using="image_vector",
            limit=2
        ).points
        
        # Build context for LLM
        current_context = "\n".join([hit.payload.get("report_text", "")[:500] for hit in current_similar])
        historical_context = "\n".join([hit.payload.get("report_text", "")[:500] for hit in historical_similar])
        
        comparison_prompt = f"""Compare these two medical scans and provide a detailed analysis of changes/improvements:

**CURRENT SCAN ({current_payload.get('upload_date', 'Recent')})**:
Similar cases indicate: {current_context[:800]}

**PREVIOUS SCAN ({historical_payload.get('upload_date', 'Earlier')})**:
Similar cases indicated: {historical_context[:800]}

User's question: {request.message}

Provide:
1. Key differences observed between the scans
2. Assessment of improvement or progression
3. Clinical significance of changes
4. Recommendations for follow-up"""

        llm_response = generate_llm_response(comparison_prompt, "")
        
        return {
            "intent": "compare",
            "confidence": 0.9,
            "message": llm_response,
            "images": [
                {
                    "filename": current_payload.get("filename"),
                    "url": f"/uploads/{current_payload.get('filename')}",
                    "scan_id": current_payload.get("scan_id"),
                    "date": current_payload.get("upload_date"),
                    "label": "Current Scan"
                },
                {
                    "filename": historical_payload.get("filename"),
                    "url": f"/uploads/{historical_payload.get('filename')}",
                    "scan_id": historical_payload.get("scan_id"),
                    "date": historical_payload.get("upload_date"),
                    "label": "Previous Scan"
                }
            ],
            "scan_data": {
                "current": {
                    "scan_id": current_payload.get("scan_id"),
                    "date": current_payload.get("upload_date")
                },
                "historical": {
                    "scan_id": historical_payload.get("scan_id"),
                    "date": historical_payload.get("upload_date")
                }
            }
        }
        
    except Exception as e:
        return {
            "intent": "compare",
            "confidence": 0.5,
            "message": f"Error comparing scans: {str(e)}",
            "images": [],
            "scan_data": None
        }

@app.post("/save-chat")
async def save_chat_history(request: SaveChatRequest):
    """Save chat conversation for a specific scan"""
    try:
        # Create a deterministic UUID from patient_id and scan_id
        chat_id_string = f"{request.patient_id}_{request.scan_id}"
        chat_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chat_id_string))
        
        # Create summary for semantic search
        summary = " ".join([msg.get("content", "")[:100] for msg in request.messages[:5]])
        text_vector = get_text_embedding(summary)
        
        payload = {
            "chat_id": chat_id_string,  # Keep original string for reference
            "patient_id": request.patient_id,
            "scan_id": request.scan_id,
            "messages": request.messages,
            "saved_at": datetime.now().isoformat(),
            "message_count": len(request.messages)
        }
        
        point = models.PointStruct(
            id=chat_uuid,  # Use proper UUID
            vector={"text_vector": text_vector},
            payload=payload
        )
        
        qdrant_client.upsert(collection_name=CHAT_COLLECTION, points=[point])
        
        # Update the scan to mark it has chat history
        qdrant_client.set_payload(
            collection_name=USER_COLLECTION,
            payload={"has_chat_history": True},
            points=[request.scan_id]
        )
        
        return {"success": True, "message": "Chat history saved"}
        
    except Exception as e:
        print(f"Error saving chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save chat: {str(e)}")

@app.post("/get-chat-history")
async def get_chat_history(request: GetChatHistoryRequest):
    """Retrieve chat history for a specific scan"""
    try:
        # Create the same deterministic UUID
        chat_id_string = f"{request.patient_id}_{request.scan_id}"
        chat_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chat_id_string))
        
        result = qdrant_client.retrieve(
            collection_name=CHAT_COLLECTION,
            ids=[chat_uuid],
            with_payload=True
        )
        
        if result:
            return {
                "success": True,
                "messages": result[0].payload.get("messages", []),
                "saved_at": result[0].payload.get("saved_at")
            }
        
        return {"success": True, "messages": [], "saved_at": None}
        
    except Exception as e:
        print(f"Error getting chat history: {str(e)}")
        return {"success": False, "messages": [], "error": str(e)}

@app.post("/update-scan-report")
async def update_scan_report(scan_id: str = Form(...), report_text: str = Form(...), status: str = Form(default="normal")):
    """Update the report/findings for a scan after analysis"""
    try:
        qdrant_client.set_payload(
            collection_name=USER_COLLECTION,
            payload={
                "report_text": report_text,
                "status": status,
                "analyzed_at": datetime.now().isoformat()
            },
            points=[scan_id]
        )
        
        return {"success": True, "message": "Scan report updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)