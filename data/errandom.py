import json
import os
import random
import matplotlib.pyplot as plt
from PIL import Image
import textwrap

# --- CONFIGURATION ---
JSON_FILE = "radiology_memory.json"
SAMPLES_TO_CHECK = 5  # How many you want to verify

def verify_samples():
    # 1. Load Data
    try:
        with open(JSON_FILE, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ File not found.")
        return

    # 2. Pick Random Samples
    if len(data) < SAMPLES_TO_CHECK:
        samples = data
    else:
        samples = random.sample(data, SAMPLES_TO_CHECK)

    # 3. Display Them
    print(f"🔍 Inspecting {len(samples)} random records...\n")

    for i, record in enumerate(samples):
        image_path = record['image_path']
        report_text = record['report_text']
        patient_id = record['patient_id']
        modality = record.get('modality', 'Unknown')

        print(f"--- Record {i+1} (ID: {patient_id}) ---")
        print(f"📂 Path: {image_path}")
        print(f"📝 Report:\n{textwrap.fill(report_text, width=80)}")
        print("-" * 50)

        # Visual Plot
        try:
            # Fix path separators for Windows if needed
            if os.name == 'nt':
                image_path = image_path.replace('/', '\\')

            img = Image.open(image_path)
            
            plt.figure(figsize=(10, 5))
            plt.imshow(img, cmap='gray')
            plt.axis('off')
            plt.title(f"Patient: {patient_id} | Modality: {modality}\n(Close window to see next)")
            plt.show()
            
        except Exception as e:
            print(f"❌ Could not load image: {e}")
            print("   (Check if the file actually exists in the folder)")

if __name__ == "__main__":
    verify_samples()