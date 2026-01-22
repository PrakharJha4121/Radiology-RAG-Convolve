import requests
import json
from pathlib import Path

API_URL = "http://localhost:8080"

# Test 1: Upload a scan
print("=" * 60)
print("TEST 1: Uploading a scan...")
print("=" * 60)

# Create a simple test image
from PIL import Image
import numpy as np

# Create a simple grayscale test image
test_image = Image.fromarray(np.random.randint(0, 255, (256, 256), dtype=np.uint8), 'L')
test_image.save("test_scan.jpg")

with open("test_scan.jpg", "rb") as f:
    files = {"file": f}
    data = {
        "patient_id": "PID1",
        "scan_type": "CXR",
        "notes": "Test scan for medical history"
    }
    
    response = requests.post(f"{API_URL}/upload-scan", files=files, data=data)
    upload_result = response.json()
    print(f"Upload Response: {json.dumps(upload_result, indent=2)}")
    
    if response.status_code == 200:
        scan_id = upload_result.get("scan_id")
        print(f"✅ Scan uploaded successfully! Scan ID: {scan_id}")
    else:
        print(f"❌ Upload failed: {response.text}")
        exit(1)

# Test 2: Request analysis (should trigger file saving)
print("\n" + "=" * 60)
print("TEST 2: Requesting analysis (this should save files)...")
print("=" * 60)

response = requests.post(
    f"{API_URL}/analyze-scan",
    json={"scan_id": scan_id},
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    analysis_result = response.json()
    print(f"Analysis Response: {json.dumps(analysis_result, indent=2)}")
    
    if analysis_result.get("medical_history_saved"):
        print(f"✅ Medical history saved: TRUE")
    else:
        print(f"❌ Medical history saved: FALSE")
else:
    print(f"❌ Analysis failed: {response.text}")
    exit(1)

# Test 3: Check if files were actually saved
print("\n" + "=" * 60)
print("TEST 3: Checking if files were saved to disk...")
print("=" * 60)

medical_history_path = Path("storage/medical_history")

if medical_history_path.exists():
    print(f"✅ Medical history folder exists: {medical_history_path}")
    
    # List all folders
    for patient_folder in medical_history_path.iterdir():
        if patient_folder.is_dir():
            print(f"\n📁 Patient folder: {patient_folder.name}")
            
            for analysis_folder in patient_folder.iterdir():
                if analysis_folder.is_dir():
                    print(f"  📂 Analysis: {analysis_folder.name}")
                    
                    # List files in analysis folder
                    for file in analysis_folder.iterdir():
                        file_size = file.stat().st_size if file.is_file() else "N/A"
                        print(f"     ✅ {file.name} ({file_size} bytes)")
                        
                        # Show content preview
                        if file.name == "analysis.txt" and file.is_file():
                            with open(file, "r") as f:
                                content = f.read()[:200]
                                print(f"        Preview: {content}...")
                        
                        elif file.name == "metadata.json" and file.is_file():
                            with open(file, "r") as f:
                                meta = json.load(f)
                                print(f"        Patient ID: {meta.get('patient_id')}")
                                print(f"        Created: {meta.get('created_at')}")
else:
    print(f"❌ Medical history folder NOT found!")
    print(f"   Expected at: {medical_history_path.absolute()}")

print("\n" + "=" * 60)
print("✅ TEST COMPLETE")
print("=" * 60)
