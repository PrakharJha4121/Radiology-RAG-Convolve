# File Storage Flow Diagram

## Process Flow: From Upload to Stored Files

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS SCAN                                        │
│    POST /upload-scan                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND: Upload Handler                                     │
│ ├─ Receive: chest_xray.jpg (from Patient PID1)             │
│ ├─ Generate: BioMedCLIP embeddings                         │
│ └─ Store in: uploads/[uuid].jpg                            │
│    Store in: Qdrant USER_COLLECTION                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │ User receives scan_id        │
        │ Frontend shows: "Uploaded"   │
        └──────────────┬──────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ USER REQUESTS ANALYSIS              │
    │ POST /analyze-scan                  │
    └──────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND: Analysis Handler                                   │
│ ├─ Retrieve: scan from USER_COLLECTION                     │
│ ├─ Search: similar cases from KNOWLEDGE_COLLECTION         │
│ ├─ Generate: AI analysis via Gemini LLM                    │
│ │                                                           │
│ └─ 🆕 SAVE FILES:                                          │
│    ├─ patient_id = "PID1" (extracted from scan)           │
│    ├─ folder_id = UUID (new)                              │
│    │                                                       │
│    └─ CREATE FOLDER STRUCTURE:                             │
│       storage/medical_history/PID1/[folder_id]/           │
│       ├─ scan.jpg        ← Original image copy             │
│       ├─ analysis.txt    ← AI analysis text               │
│       └─ metadata.json   ← File references + timestamps    │
│                                                           │
│    └─ INDEX IN QDRANT:                                    │
│       Create entry in MEDICAL_HISTORY_COLLECTION          │
│       with text vector & full payload                     │
│                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │ Response includes:           │
        │ - analysis text              │
        │ - similar_cases              │
        │ - medical_history_saved: true│
        └──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FILES NOW STORED PERMANENTLY                                │
│                                                             │
│ Disk Storage:                                               │
│ └─ storage/medical_history/PID1/[uuid]/                    │
│    ├─ scan.jpg          (from uploads/)                    │
│    ├─ analysis.txt      (AI generated)                     │
│    └─ metadata.json     (tracking)                         │
│                                                             │
│ Qdrant Storage:                                             │
│ └─ MEDICAL_HISTORY_COLLECTION                              │
│    ├─ folder_id: UUID                                      │
│    ├─ payload: all file references                         │
│    └─ text_vector: indexed for search                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Organization Example

After 2 analyses for Patient PID1:

```
storage/medical_history/
│
└── PID1/                          (Patient ID)
    │
    ├── 3a622c29-e5b1-4d6a-8813/  (Session 1: 2026-01-22 10:30:45)
    │   ├── scan.jpg               (Original chest X-ray)
    │   ├── analysis.txt           (AI findings from Gemini)
    │   └── metadata.json
    │       {
    │         "patient_id": "PID1",
    │         "folder_id": "3a622c29-e5b1-4d6a-8813",
    │         "created_at": "2026-01-22T10:30:45.123456",
    │         "files": {
    │           "image": "storage/medical_history/PID1/.../scan.jpg",
    │           "analysis": "storage/medical_history/PID1/.../analysis.txt",
    │           "metadata": "storage/medical_history/PID1/.../metadata.json"
    │         },
    │         "original_filename": "chest_xray_1.jpg"
    │       }
    │
    └── 318e8fb0-ca85-4bd6-bd8f/  (Session 2: 2026-01-22 15:45:30)
        ├── scan.jpg               (Follow-up chest X-ray)
        ├── analysis.txt           (Updated AI findings)
        └── metadata.json
            {
              "patient_id": "PID1",
              "folder_id": "318e8fb0-ca85-4bd6-bd8f",
              "created_at": "2026-01-22T15:45:30.654321",
              "original_filename": "chest_xray_2.jpg"
            }
```

---

## Data Flow Summary

```
INPUT                PROCESSING              STORAGE
─────────────────────────────────────────────────────────

Scan Image           ┌─────────────┐        uploads/[uuid].jpg
  ↓                  │   /upload   │        Qdrant: USER_COLLECTION
Patient ID           └─────┬───────┘
Scan Type                  │
                           ↓
                     ┌─────────────┐
                     │  /analyze   │        storage/medical_history/
                     │    (RAG)    │        [patient_id]/[folder_id]/
                     └─────┬───────┘        ├─ scan.jpg
                           │                ├─ analysis.txt
AI Analysis                │                └─ metadata.json
Similar Cases              ↓
                    ┌──────────────┐        Qdrant: MEDICAL_HISTORY_
                    │   RESPONSE   │        COLLECTION
                    └──────────────┘        (indexed for search)
```

---

## Key Implementation Details

### File Naming Convention
- **Image:** `scan.[original_extension]` (preserves format)
- **Analysis:** `analysis.txt` (UTF-8 encoded)
- **Metadata:** `metadata.json` (standardized)

### Folder ID Generation
- New UUID generated for each analysis
- Ensures no conflicts between multiple analyses
- Unique path: `storage/medical_history/[patient_id]/[uuid]/`

### Error Handling
- If save fails: Warning logged, analysis still returned ✓
- If metadata fails: Continues with file storage ✓
- If Qdrant upsert fails: Files still on disk ✓

### Performance
- Files saved asynchronously within the response flow
- Metadata lightweight (JSON, ~1-2 KB)
- No impact on analysis generation time
