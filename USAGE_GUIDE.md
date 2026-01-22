# Medical History File Storage - Usage Guide

## Quick Start

### 1. Upload a Scan
```bash
curl -X POST "http://localhost:8000/upload-scan" \
  -F "file=@chest_xray.jpg" \
  -F "patient_id=PID1" \
  -F "scan_type=CXR" \
  -F "notes=Follow-up scan"
```

**Response:**
```json
{
  "success": true,
  "scan_id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4",
  "filename": "0f7a3c5b-1234-5678-abcd-ef1234567890.jpg",
  "upload_timestamp": "2026-01-22T10:30:45.123456",
  "message": "Scan uploaded and saved to patient records."
}
```

---

### 2. Request Analysis (NEW: Automatically Saves Files)
```bash
curl -X POST "http://localhost:8000/analyze-scan" \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4"
  }'
```

**Response:**
```json
{
  "status": "success",
  "analysis": "Based on visual similarity analysis, findings include: [...detailed AI analysis...]",
  "similar_cases": [
    {
      "similarity_score": 0.8234,
      "diagnosis_report": "Similar case report text...",
      "reference_case_id": "abc-123"
    }
  ],
  "reasoning": "Analysis generated using RAG with BioMedCLIP embeddings and Gemini LLM.",
  "medical_history_saved": true
}
```

---

### 3. View Saved Files

After analysis, files are created at:

```
storage/medical_history/PID1/[folder_id]/
├── scan.jpg
├── analysis.txt
└── metadata.json
```

#### View Image
```powershell
# Windows PowerShell
Get-ChildItem -Path "storage/medical_history/PID1" -Recurse -Include "scan.*"
```

#### View Analysis
```powershell
# Windows PowerShell
Get-Content "storage/medical_history/PID1/[folder_id]/analysis.txt"
```

#### View Metadata
```powershell
# Windows PowerShell
Get-Content "storage/medical_history/PID1/[folder_id]/metadata.json" | ConvertFrom-Json | Format-Table
```

---

## Frontend Integration

### React/TypeScript Example

```typescript
// 1. Upload scan
const uploadScan = async (file: File, patientId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patient_id', patientId);
  formData.append('scan_type', 'CXR');
  formData.append('notes', 'Routine follow-up');

  const response = await fetch('http://localhost:8000/upload-scan', {
    method: 'POST',
    body: formData
  });

  return response.json(); // { scan_id, filename, ... }
};

// 2. Request analysis (files auto-saved to medical_history)
const analyzeAndSave = async (scanId: string) => {
  const response = await fetch('http://localhost:8000/analyze-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan_id: scanId })
  });

  const result = response.json();
  
  if (result.medical_history_saved) {
    console.log('✅ Image and analysis automatically saved to medical history!');
  }
  
  return result; // { analysis, similar_cases, medical_history_saved: true }
};
```

---

## Folder Structure Deep Dive

### Complete Example After 1 Analysis

```
storage/medical_history/
│
└── PID1/
    └── 3a622c29-e5b1-4d6a-8813-5d82c23706f4/
        │
        ├── scan.jpg (45 KB)
        │   Type: Original medical image
        │   Content: Binary JPEG data
        │   Preserved: Original format and quality
        │
        ├── analysis.txt (2.3 KB)
        │   Type: AI-generated radiological analysis
        │   Content: Plain text UTF-8
        │   Example:
        │   ┌────────────────────────────────┐
        │   │ Based on visual similarity      │
        │   │ analysis, the uploaded chest    │
        │   │ X-ray shows:                    │
        │   │                                 │
        │   │ 1. No acute cardiopulmonary     │
        │   │    process                      │
        │   │ 2. Heart size within normal     │
        │   │    limits                       │
        │   │ 3. Clear bilateral lung fields  │
        │   │                                 │
        │   │ Recommendation: Routine         │
        │   │ follow-up in 6-12 months       │
        │   └────────────────────────────────┘
        │
        └── metadata.json (0.5 KB)
            Type: File tracking metadata
            Content: JSON structured data
            
            {
              "patient_id": "PID1",
              "folder_id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4",
              "created_at": "2026-01-22T10:30:45.123456",
              "files": {
                "image": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/scan.jpg",
                "analysis": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/analysis.txt",
                "metadata": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/metadata.json"
              },
              "original_filename": "chest_xray_20260122.jpg"
            }
```

---

## Database Integration

### Qdrant Medical History Entry

When analysis is completed, this entry is created in `MEDICAL_HISTORY_COLLECTION`:

```json
{
  "id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4",
  "vector": {
    "text_vector": [0.234, 0.456, -0.123, ..., 0.789]  // 512 dimensions
  },
  "payload": {
    "patient_id": "PID1",
    "item_type": "folder",
    "name": "Analysis - 2026-01-22 10:30:45",
    "parent_path": "",
    "scan_id": "3a622c29-e5b1-4d6a-8813-5d82c23706f4",
    "analysis": "Based on visual similarity analysis, findings include...",
    "created_at": "2026-01-22T10:30:45.123456",
    "files": {
      "image": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/scan.jpg",
      "analysis": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/analysis.txt",
      "metadata": "storage/medical_history/PID1/3a622c29-e5b1-4d6a-8813-5d82c23706f4/metadata.json"
    }
  }
}
```

**Benefits:**
- ✅ Text vector indexed for semantic search
- ✅ File paths preserved for retrieval
- ✅ Timestamp for chronological sorting
- ✅ Patient ID for grouping

---

## Troubleshooting

### Issue: Files not appearing in folder
**Solution:** Check logs for errors
```powershell
# Check backend logs
tail -f backend.log | grep -i "medical_history\|error"
```

### Issue: Permission denied when saving
**Solution:** Ensure `storage/` folder has write permissions
```powershell
# Windows PowerShell
New-Item -ItemType Directory -Path "storage/medical_history" -Force
```

### Issue: metadata.json not readable
**Solution:** File might have encoding issues
```powershell
# View with proper encoding
Get-Content "storage/medical_history/PID1/[folder_id]/metadata.json" -Encoding UTF8
```

---

## Performance Notes

| Operation | Time | Size |
|-----------|------|------|
| Image copy | ~10ms | ~50 KB |
| Analysis write | ~5ms | ~2-5 KB |
| Metadata creation | ~2ms | ~0.5 KB |
| Qdrant upsert | ~50ms | Vector + payload |
| **Total** | **~70ms** | **~52 KB** |

*Minimal overhead - does not impact user experience*

---

## Retention Policy (Future)

Consider implementing:
- Automatic cleanup of old analyses (>1 year)
- Compression of older scan images
- Archive to external storage
- Database pruning of Qdrant entries

Example: Keep last 50 analyses per patient, archive older ones.

---

## Security Considerations

✅ Files stored in `storage/` (outside `uploads/`)  
✅ UUID folder names prevent directory traversal  
✅ Patient ID in path enables access control  
✅ Metadata timestamps track creation  
✅ Original filename preserved for reference  

**Recommendation:** Implement role-based access control on the `storage/medical_history/` directory.
