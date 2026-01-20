import os
import json
import uuid
import random
from datasets import load_dataset
from tqdm import tqdm

# --- CONFIGURATION ---
OUTPUT_DIR = "./data/chest_xrays"
OUTPUT_JSON = "radiology_memory.json"
MAX_SAMPLES = 20000 

# 1. BODY PART FILTER (Must have at least one)
TARGET_ORGANS = ["chest", "lung", "thorax", "pleural", "pulmonary", "mediastinum"]

# 2. MODALITY INCLUSION (Must have at least one)
# This ensures it is actually an X-ray
POSITIVE_KEYWORDS = ["x-ray", "xray", "radiograph", "cxr", "roentgenogram"]

# 3. MODALITY EXCLUSION (Must have NONE)
# This kills the noise (CTs, MRIs, etc.)
NEGATIVE_KEYWORDS = [
    "computed tomography", " ct ", "ct scan", "cat scan", # CTs
    "mri", "magnetic resonance", "t1", "t2", "weighted", # MRIs
    "ultrasound", "sonogram", "doppler", "echocardiogram", # Ultrasounds
    "pet scan", "pet/ct", "scintigraphy", "nuclear", # Nuclear
    "angiogram", "angiography", "fluoroscopy" # Live video/Dye
]

def is_pure_chest_xray(text):
    """
    Returns True ONLY if it's a Chest X-ray.
    Rejects CTs, MRIs, and non-chest images.
    """
    text = text.lower()
    
    # 1. Check Body Part
    if not any(organ in text for organ in TARGET_ORGANS):
        return False
        
    # 2. Check Modality (Must be X-ray)
    if not any(mod in text for mod in POSITIVE_KEYWORDS):
        return False
        
    # 3. Check Exclusions (Must NOT be CT/MRI/etc)
    if any(bad in text for bad in NEGATIVE_KEYWORDS):
        return False
        
    return True

def setup_chest_data():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"📥 Connecting to ROCOv2...")
    print(f"🎯 Target: {MAX_SAMPLES} Pure Chest X-rays (Strict Filter Active)...")
    
    dataset = load_dataset("eltorio/ROCOv2-radiology", split="train", streaming=True)

    clean_payloads = []
    count = 0
    
    # We use a progress bar to track successful finds
    pbar = tqdm(total=MAX_SAMPLES, desc="⬇️ Finding Pure X-rays")

    try:
        for record in dataset:
            if count >= MAX_SAMPLES:
                break

            report_text = record.get("caption", "")
            
            # --- THE STRICT FILTER ---
            if is_pure_chest_xray(report_text):
                
                image_filename = f"chest_{uuid.uuid4().hex[:8]}.jpg"
                image_path = os.path.join(OUTPUT_DIR, image_filename)
                
                try:
                    record["image"].convert("RGB").save(image_path)
                    
                    payload = {
                        "patient_id": f"P_{random.randint(100000, 999999)}",
                        "scan_date": f"2023-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                        "modality": "CXR", # Now we can confidently label it CXR
                        "diagnosis": [word for word in ["pneumonia", "edema", "normal", "atelectasis", "effusion", "opacity", "cardiomegaly", "nodule", "fracture", "pneumothorax"] if word in report_text.lower()] or ["findings"],
                        "report_text": report_text, 
                        "image_path": image_path
                    }
                    
                    clean_payloads.append(payload)
                    count += 1
                    pbar.update(1)

                except Exception:
                    continue

    except KeyboardInterrupt:
        print("\n🛑 Download stopped by user. Saving what we have so far...")

    pbar.close()

    print(f"\n💾 Saving database to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(clean_payloads, f, indent=4)

    print(f"\n✅ DONE! Collected {len(clean_payloads)} HIGH QUALITY X-rays.")

if __name__ == "__main__":
    setup_chest_data()