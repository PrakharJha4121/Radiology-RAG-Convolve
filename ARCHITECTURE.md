# Complete System Architecture - Medical History Storage

## End-to-End Data Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE (Frontend)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Upload Screen              Chat Interface         Medical History         │
│  ┌──────────────┐          ┌──────────────┐       ┌──────────────┐        │
│  │ Select Image │ ━━━━━━━> │  Analyze?    │ ━━━━> │ View Scans & │        │
│  │ patient_id   │          │  Ask AI      │       │ Analysis     │        │
│  │ scan_type    │          │ (RAG Chat)   │       │ (History)    │        │
│  └──────────────┘          └──────────────┘       └──────────────┘        │
│         ↓                          ↓                       ↑                │
│    POST /upload-scan         POST /analyze-scan    GET /medical-history   │
│         │                          │                      │                │
└─────────┼──────────────────────────┼──────────────────────┼────────────────┘
          │                          │                      │
          ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API (FastAPI)                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Upload Handler              Analysis Handler         History Handler      │
│  ┌─────────────────┐        ┌──────────────────┐     ┌─────────────────┐  │
│  │ 1. Receive file │        │ 1. Get scan from │     │ 1. Query Qdrant │  │
│  │ 2. Save temp    │        │    USER_COL      │     │ 2. Retrieve     │  │
│  │ 3. BioMedCLIP   │        │ 2. RAG search    │     │    files        │  │
│  │    embedding    │        │ 3. Gemini LLM    │     │ 3. Return data  │  │
│  │ 4. Store Qdrant │        │ 4. 🆕 Save to    │     └─────────────────┘  │
│  │ 5. Return scan_ │        │    medical_hist  │                          │
│  │    id           │        │ 5. Create entry  │                          │
│  │                 │        │    in MEDICAL_   │                          │
│  │ Output:         │        │    HISTORY_COL   │                          │
│  │ scan_id, file   │        │ 6. Return        │                          │
│  │ path            │        │    analysis      │                          │
│  └─────────────────┘        └──────────────────┘                          │
│         │                            │                                     │
│         │                    ┌───────┴────────┐                           │
│         │                    │                │                           │
│         ▼                    ▼                ▼                           │
│    ┌─────────────────────────────────────────────────┐                   │
│    │ 🆕 save_to_medical_history(                     │                   │
│    │     patient_id,                                 │                   │
│    │     folder_id,                                  │                   │
│    │     image_path,                                 │                   │
│    │     analysis_text                               │                   │
│    │ )                                               │                   │
│    └─────────────────────────────────────────────────┘                   │
│         │                    │                    │                       │
│         ▼                    ▼                    ▼                       │
└─────┬──────────────────┬──────────────────┬──────────────────┬───────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  DISK STORE  │  │  DISK STORE  │  │ DISK STORE   │  │  QDRANT DB   │
│              │  │              │  │              │  │              │
│ uploads/     │  │ storage/     │  │ storage/     │  │ MEDICAL_     │
│ [uuid].jpg   │  │ medical_hist/│  │ medical_hist/│  │ HISTORY_COL  │
│              │  │ PID1/        │  │ PID1/        │  │              │
│              │  │ [uuid]/      │  │ [uuid]/      │  │ Entry:       │
│ (Original)   │  │ scan.jpg     │  │ metadata.json│  │ - folder_id  │
│              │  │ (Copy)       │  │ (Tracking)   │  │ - patient_id │
│              │  │              │  │              │  │ - analysis   │
│              │  │ (NEW! 🆕)    │  │ (NEW! 🆕)    │  │ - files refs │
└──────────────┘  └──────────────┘  └──────────────┘  │ - text_vec   │
                                                       └──────────────┘
```

---

## Detailed Component Breakdown

### 1️⃣ UPLOAD PHASE

```
Frontend: User uploads chest_xray.jpg
          ├─ patient_id: "PID1"
          ├─ scan_type: "CXR"
          └─ notes: "Follow-up"
                    ↓
Backend: POST /upload-scan
          ├─ Save: uploads/[uuid].jpg
          ├─ Generate: 512-dim image embedding (BioMedCLIP)
          ├─ Generate: 512-dim text embedding
          └─ Store in Qdrant USER_COLLECTION
                    ↓
Response: {
  "scan_id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4",
  "filename": "[uuid].jpg"
}
```

---

### 2️⃣ ANALYSIS PHASE (🆕 File Storage)

```
Frontend: User clicks "Analyze"
          └─ scan_id: "3a622c29-e5b1-4d6a-8813-5d82c23706f4"
                    ↓
Backend: POST /analyze-scan
          ├─ Retrieve: scan from USER_COLLECTION
          ├─ Query: KNOWLEDGE_COLLECTION for similar cases (RAG)
          ├─ Generate: AI analysis via Gemini LLM
          │
          └─ 🆕 SAVE FILES:
             ├─ Call: save_to_medical_history(
             │        patient_id="PID1",
             │        folder_id="[new-uuid]",
             │        image_path="uploads/[uuid].jpg",
             │        analysis_text="AI findings...",
             │        original_filename="chest_xray.jpg"
             │        )
             │
             ├─ Creates: storage/medical_history/PID1/[uuid]/
             │
             ├─ Saves:
             │  ├─ scan.jpg (copy from uploads)
             │  ├─ analysis.txt (AI findings)
             │  └─ metadata.json (tracking)
             │
             └─ Qdrant: Create MEDICAL_HISTORY_COLLECTION entry
                        with all file references
                    ↓
Response: {
  "analysis": "Based on visual similarity...",
  "similar_cases": [...],
  "medical_history_saved": true  ✅
}
```

---

### 3️⃣ STORAGE ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│ DISK STRUCTURE (Permanent Storage)              │
├─────────────────────────────────────────────────┤
│                                                 │
│  storage/medical_history/                      │
│  └─ PID1/                                      │
│     └─ 3a622c29-e5b1-4d6a.../                 │
│        ├─ scan.jpg                            │
│        ├─ analysis.txt                        │
│        └─ metadata.json                       │
│                                                 │
│  FILES PERSIST FOREVER (on disk)              │
│  └─ Can be backed up, archived, recovered     │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ QDRANT VECTORS (Indexed for Search)            │
├─────────────────────────────────────────────────┤
│                                                 │
│  MEDICAL_HISTORY_COLLECTION                    │
│  └─ Entry {                                    │
│       id: "3a622c29-e5b1-4d6a",              │
│       text_vector: [0.123, 0.456, ...],      │
│       payload: {                               │
│         patient_id: "PID1",                   │
│         analysis: "...",                      │
│         files: { file references },           │
│         created_at: "2026-01-22..."           │
│       }                                        │
│     }                                          │
│                                                 │
│  VECTORS INDEXED                              │
│  └─ Enable semantic search & retrieval         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Data Persistence

### What Happens to Each File

```
ORIGINAL UPLOAD
│
├─ uploads/[uuid].jpg
│  ├─ Location: Temporary upload folder
│  ├─ Used by: Analysis generation
│  └─ Status: Remains as reference
│
└─ Qdrant USER_COLLECTION
   ├─ Stores: Image & text embeddings + metadata
   ├─ Used by: Chat, history retrieval
   └─ Status: Indexed & searchable


ANALYSIS PHASE (NEW!)
│
├─ storage/medical_history/PID1/[uuid]/scan.jpg
│  ├─ Location: Permanent storage (organized by patient)
│  ├─ Content: Copy of original scan
│  ├─ Used by: Medical record retrieval, viewing
│  └─ Status: PERMANENT ✅
│
├─ storage/medical_history/PID1/[uuid]/analysis.txt
│  ├─ Location: Permanent storage (organized by patient)
│  ├─ Content: AI-generated findings
│  ├─ Used by: Clinical review, history reference
│  └─ Status: PERMANENT ✅
│
├─ storage/medical_history/PID1/[uuid]/metadata.json
│  ├─ Location: Permanent storage (organized by patient)
│  ├─ Content: File references & timestamps
│  ├─ Used by: Audit trail, data recovery
│  └─ Status: PERMANENT ✅
│
└─ Qdrant MEDICAL_HISTORY_COLLECTION
   ├─ Stores: Analysis + file references + vectors
   ├─ Used by: Search, retrieval, chat context
   └─ Status: INDEXED & SEARCHABLE ✅
```

---

## Key Improvements

### Before (Old System)
```
Upload → Embeddings in Qdrant → Analysis in Chat → ❌ No Files Saved
```

### After (New System)
```
Upload → Embeddings in Qdrant → Analysis + Files Saved → ✅ Complete Medical Record
```

---

## File Access Paths

```
Medical History Folder Structure:
storage/medical_history/
│
├── PID1/
│   ├── 3a622c29-e5b1-4d6a.../
│   │   ├── scan.jpg
│   │   │   └─ Accessed via: storage/medical_history/PID1/[uuid]/scan.jpg
│   │   ├── analysis.txt
│   │   │   └─ Accessed via: storage/medical_history/PID1/[uuid]/analysis.txt
│   │   └── metadata.json
│   │       └─ Accessed via: storage/medical_history/PID1/[uuid]/metadata.json
│   │
│   └── 318e8fb0-ca85-4bd6.../
│       ├── scan.jpg
│       ├── analysis.txt
│       └── metadata.json
│
└── PID2/
    └── [future analyses]

Qdrant References:
MEDICAL_HISTORY_COLLECTION
├── Entry 1
│   └─ payload.files = {
│       "image": "storage/medical_history/PID1/.../scan.jpg",
│       "analysis": "storage/medical_history/PID1/.../analysis.txt",
│       "metadata": "storage/medical_history/PID1/.../metadata.json"
│      }
└── Entry 2
    └─ payload.files = {...}
```

---

## Summary

✅ **Image Scans** - Stored permanently in organized folders  
✅ **AI Analysis** - Saved as text files for easy access  
✅ **Metadata** - JSON tracking for all file references  
✅ **Qdrant Integration** - Indexed for search & retrieval  
✅ **Patient Organization** - Files grouped by patient ID  
✅ **Timestamped** - Each analysis has creation timestamp  
✅ **Error Resilient** - Works even if individual saves fail  

**Result: Complete, permanent medical record for each patient! 🎉**
