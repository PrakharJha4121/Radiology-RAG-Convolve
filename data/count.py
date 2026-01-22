import os
from datasets import load_dataset
from tqdm import tqdm
from collections import Counter

# --- CONFIGURATION ---
TARGET_SPLIT = "train" 
MAX_SAMPLES = 20000  # <--- LIMIT SET HERE

def detect_modality(text):
    """
    Analyzes text to classify the image modality.
    """
    text = text.lower()
    
    # Priority checks 
    if any(k in text for k in ["ct", "computed tomography", "cat scan", "hounsfield"]):
        return "CT Scan"
    elif any(k in text for k in ["mri", "magnetic resonance", "t1", "t2", "flair", "diffusion weighted"]):
        return "MRI"
    elif any(k in text for k in ["ultrasound", "sonogram", "doppler", "echo", "transducer", "echogenicity"]):
        return "Ultrasound"
    elif any(k in text for k in ["pet", "positron emission", "scintigraphy", "nuclear", "fdg"]):
        return "Nuclear/PET"
    elif any(k in text for k in ["angiogram", "angiography", "fluoroscopy", "contrast run"]):
        return "Angiography/Fluoro"
    elif any(k in text for k in ["x-ray", "xray", "radiograph", "cxr", "plain film", "roentgen"]):
        return "X-Ray"
    else:
        return "Other/General"

def count_dataset_stats():
    print(f"📊 Connecting to ROCOv2 ({TARGET_SPLIT} split)...")
    print(f"🎯 Limit: Checking first {MAX_SAMPLES} samples only...")

    # Streaming = True (Fast, no image download)
    dataset = load_dataset("eltorio/ROCOv2-radiology", split=TARGET_SPLIT, streaming=True)
    
    stats = Counter()
    total_checked = 0
    
    # Initialize progress bar with total=MAX_SAMPLES
    pbar = tqdm(total=MAX_SAMPLES, desc="Scanning Captions")
    
    try:
        for record in dataset:
            # --- STOP CONDITION ---
            if total_checked >= MAX_SAMPLES:
                break
            
            caption = record.get("caption", "")
            modality = detect_modality(caption)
            stats[modality] += 1
            
            total_checked += 1
            pbar.update(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping early...")
    
    pbar.close()

    print(f"\n\n=== 📈 FINAL COUNTS (n={total_checked}) ===")
    print(f"{'MODALITY':<20} | {'COUNT':<10} | {'PERCENT':<10}")
    print("-" * 45)
    
    for mod, count in stats.most_common():
        percent = (count / total_checked) * 100
        print(f"{mod:<20} | {count:<10} | {percent:.1f}%")

if __name__ == "__main__":
    count_dataset_stats()