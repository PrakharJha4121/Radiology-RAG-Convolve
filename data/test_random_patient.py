import json
import os
import torch
import random
import open_clip
import matplotlib.pyplot as plt
import textwrap
from PIL import Image
from qdrant_client import QdrantClient

# --- CONFIGURATION ---
TEST_FILE = "radiology_test_set.json" 
COLLECTION_NAME = "radiology_memory"

from dotenv import load_dotenv # <--- 1. Add this import

# Load environment variables from .env file
load_dotenv() # <--- 2. Add this line

# ... existing imports ...

# --- CONFIGURATION ---
# Replace your hardcoded strings with os.getenv("VARIABLE_NAME")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION")
MODEL_ID = os.getenv("MODEL_NAME")

# --- 🏥 LOAD MODEL ---
print("🏥 Loading BioMedCLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

def test_random_sample():
    # 1. Load the TEST records
    try:
        with open(TEST_FILE, 'r') as f:
            records = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {TEST_FILE} not found.")
        return

    if not records:
        print("❌ Test file is empty.")
        return
        
    # 2. Pick a RANDOM patient
    test_record = random.choice(records)
    
    test_image_path = os.path.normpath(test_record['image_path'])
    actual_report = test_record['report_text']
    patient_id = test_record.get('patient_id', 'Unknown')
    
    print(f"\n🔎 Testing Random Patient ID: {patient_id}")
    print(f"🖼️ Image: {test_image_path}")

    # 3. Generate Embedding
    if not os.path.exists(test_image_path):
        print(f"❌ Error: Image file not found at {test_image_path}")
        return

    image = preprocess(Image.open(test_image_path)).unsqueeze(0)
    with torch.no_grad():
        features = model.encode_image(image)
        features /= features.norm(dim=-1, keepdim=True)
        query_vector = features.squeeze().tolist()
        #so biomedclip returns the embedding of the IMAGE

    # 4. Search Qdrant
    try:
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            using="image_vector",
            limit=1,
            with_payload=True 
        )
        
        results = response.points

        if not results:
            print("❌ No matches found in Qdrant.")
            return

        match = results[0]
        matched_payload = match.payload
        score = match.score
        match_id = matched_payload.get('patient_id')
        match_report = matched_payload.get('report_text', '')
        match_image_path = os.path.normpath(matched_payload.get('image_path', ''))

        # --- CONSOLE OUTPUT ---
        print("\n" + "="*60)
        print(f"📊 DIAGNOSTIC MATCH RESULT (Score: {score:.4f})")
        print("="*60)
        
        print(f"\n🔵 INPUT PATIENT (The Unknown Case):")
        print(f"   ID: {patient_id}")
        print("-" * 30)
        print(f"   Diagnosis: {test_record.get('diagnosis', 'N/A')}")
        print(f"   Snippet: {actual_report[:200]}...")

        print(f"\n\n🟢 AI PREDICTED MATCH (The Retrieved Case):")
        print(f"   ID: {match_id}")
        print("-" * 30)
        print(f"   Diagnosis: {matched_payload.get('diagnosis', 'N/A')}")
        print(f"   Snippet: {match_report[:200]}...")
        
        print("\n" + "="*60)

        # --- VISUALIZATION OUTPUT ---
        print("🖼️ Displaying images...")
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 7))
        
        # Plot 1: Input Image
        img1 = Image.open(test_image_path)
        axes[0].imshow(img1, cmap='gray')
        axes[0].set_title(f"INPUT CASE\nID: {patient_id}", fontsize=12, color='blue', fontweight='bold')
        axes[0].axis('off')
        
        # Add report text below input image
        wrapped_report1 = "\n".join(textwrap.wrap(actual_report, width=50))[:500]
        axes[0].text(0.5, -0.1, f"REPORT:\n{wrapped_report1}...", 
                     transform=axes[0].transAxes, ha='center', va='top', fontsize=9, wrap=True)

        # Plot 2: Matched Image
        if os.path.exists(match_image_path):
            img2 = Image.open(match_image_path)
            axes[1].imshow(img2, cmap='gray')
            axes[1].set_title(f"BEST MATCH (Sim: {score:.4f})\nID: {match_id}", fontsize=12, color='green', fontweight='bold')
            axes[1].axis('off')
            
            # Add report text below matched image
            wrapped_report2 = "\n".join(textwrap.wrap(match_report, width=50))[:500]
            axes[1].text(0.5, -0.1, f"REPORT:\n{wrapped_report2}...", 
                         transform=axes[1].transAxes, ha='center', va='top', fontsize=9, wrap=True)
        else:
            axes[1].text(0.5, 0.5, "Image File Not Found Locally", ha='center')
            axes[1].set_title("BEST MATCH (Image Missing)", color='red')
            axes[1].axis('off')

        plt.tight_layout()
        plt.subplots_adjust(bottom=0.3) # Make room for text
        plt.show()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_random_sample()