# Medical History File Storage - Implementation Summary

## Overview
Updated the backend to automatically save **image scans** and **AI analysis** files to the medical history folder structure.

## Changes Made to `backend/main.py`

### 1. New Helper Function: `save_to_medical_history()`
**Location:** Lines ~205-255

```python
def save_to_medical_history(
    patient_id: str,
    folder_id: str,
    image_path: Optional[str] = None,
    analysis_text: Optional[str] = None,
    original_filename: Optional[str] = None
):
```

**Purpose:** Saves files to the medical history folder structure.

**Functionality:**
- ✅ Creates folder: `storage/medical_history/[patient_id]/[folder_id]/`
- ✅ Saves image scan as: `scan.[extension]`
- ✅ Saves AI analysis as: `analysis.txt`
- ✅ Saves metadata as: `metadata.json` (includes timestamps, file references, patient info)
- ✅ Returns dictionary of saved file paths for tracking

**Example Structure After Analysis:**
```
storage/medical_history/
├── PID1/
│   ├── 318e8fb0-ca85-4bd6-bd8f-f3e8c9ee5b13/
│   │   ├── scan.jpg
│   │   ├── analysis.txt
│   │   └── metadata.json
│   ├── 3a622c29-e5b1-4d6a-8813-5d82c23706f4/
│   │   ├── scan.jpg
│   │   ├── analysis.txt
│   │   └── metadata.json
```

---

### 2. Updated Endpoint: `/analyze-scan` (POST)
**Location:** Lines ~442-540

**Changes:**
- ✅ Extracts patient information from the scan record
- ✅ Retrieves the original image file path
- ✅ Generates AI analysis (existing functionality)
- ✅ **NEW:** Calls `save_to_medical_history()` to save both image and analysis
- ✅ **NEW:** Creates a medical history folder entry in Qdrant with references to saved files
- ✅ **NEW:** Returns `"medical_history_saved": True/False` in response

**Flow:**
1. User uploads scan via `/upload-scan`
2. User requests analysis via `/analyze-scan`
3. AI generates analysis using RAG + Gemini
4. Image and analysis are automatically saved to: `storage/medical_history/[patient_id]/[folder_id]/`
5. Medical history entry is created in Qdrant with file metadata
6. Response includes flag indicating successful storage

---

## File Structure After Analysis

Each analysis creates:

### `scan.[ext]`
- Original uploaded medical image
- Preserved in original format (JPEG, PNG, etc.)

### `analysis.txt`
- Full AI-generated radiological analysis
- Human-readable text format
- Contains findings and recommendations

### `metadata.json`
```json
{
  "patient_id": "PID1",
  "folder_id": "318e8fb0-ca85-4bd6-bd8f-f3e8c9ee5b13",
  "created_at": "2026-01-22T10:30:45.123456",
  "files": {
    "image": "storage/medical_history/PID1/318e8fb0-ca85-4bd6-bd8f-f3e8c9ee5b13/scan.jpg",
    "analysis": "storage/medical_history/PID1/318e8fb0-ca85-4bd6-bd8f-f3e8c9ee5b13/analysis.txt",
    "metadata": "storage/medical_history/PID1/318e8fb0-ca85-4bd6-bd8f-f3e8c9ee5b13/metadata.json"
  },
  "original_filename": "chest_xray.jpg"
}
```

---

## How It Works

### Upload Phase (Existing)
```
User uploads scan → backend/main.py:/upload-scan
├── Save to uploads/ folder
├── Generate BioMedCLIP embeddings
└── Store metadata in Qdrant (USER_COLLECTION)
```

### Analysis Phase (Updated)
```
User requests analysis → backend/main.py:/analyze-scan
├── Retrieve scan from USER_COLLECTION
├── Query KNOWLEDGE_COLLECTION for similar cases
├── Generate AI analysis via Gemini LLM
├── 🆕 Save files to medical_history folder structure
│   ├── Copy image to: storage/medical_history/[patient_id]/[folder_id]/scan.[ext]
│   ├── Write analysis to: storage/medical_history/[patient_id]/[folder_id]/analysis.txt
│   └── Create metadata.json with all file references
├── 🆕 Create Qdrant entry in MEDICAL_HISTORY_COLLECTION
└── Return response with medical_history_saved flag
```

---

## Benefits

✅ **Persistent Storage** - Scans and analyses are permanently stored on disk  
✅ **Organized Structure** - Files organized by patient ID and session  
✅ **Trackable** - Metadata includes creation timestamps and file references  
✅ **Qdrant Integration** - Medical history entries are indexed for search  
✅ **Recovery Ready** - Can retrieve any past scan/analysis from folder structure  
✅ **Error Handling** - Warnings logged if save fails, analysis still returned  

---

## API Response Example

```json
{
  "status": "success",
  "analysis": "Findings: [AI-generated analysis text]...",
  "similar_cases": [...],
  "reasoning": "Analysis generated using RAG with BioMedCLIP embeddings and Gemini LLM.",
  "medical_history_saved": true
}
```

---

## Testing

To verify the implementation:

1. **Upload a scan** via the frontend
2. **Request analysis** - triggers AI generation
3. **Check folder structure:**
   ```powershell
   # Windows PowerShell
   Get-ChildItem -Recurse "backend/storage/medical_history" -Force
   ```
4. **View saved files:**
   - Image: `storage/medical_history/[patient_id]/[folder_id]/scan.jpg`
   - Analysis: `storage/medical_history/[patient_id]/[folder_id]/analysis.txt`
   - Metadata: `storage/medical_history/[patient_id]/[folder_id]/metadata.json`

---

## Next Steps (Optional)

- [ ] Add API endpoint to retrieve saved analysis files
- [ ] Add endpoint to fetch/display analysis.txt from medical history
- [ ] Implement backup mechanism for medical_history folder
- [ ] Add file size tracking and cleanup policies
